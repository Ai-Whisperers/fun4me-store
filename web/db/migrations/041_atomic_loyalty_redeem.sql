-- =============================================================================
-- 041_ATOMIC_LOYALTY_REDEEM.SQL
-- =============================================================================
-- Creates atomic loyalty redemption function to prevent race conditions.
--
-- Issue: API-C1, API-C7 from system audit
-- Problems fixed:
-- 1. Double redemption due to check-then-insert race condition
-- 2. Points overdraw due to check-then-deduct race condition
-- 3. Stock oversell due to check-then-decrement race condition
--
-- Created: 2026-01-06
-- =============================================================================

-- Function to atomically redeem a loyalty reward
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_tenant_id TEXT,
  p_user_id UUID,
  p_reward_id UUID,
  p_pet_id UUID,
  p_redemption_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward RECORD;
  v_points_balance INT;
  v_user_redemption_count INT;
  v_redemption_id UUID;
  v_target_pet_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Step 1: Get and lock the reward row
  SELECT * INTO v_reward
  FROM loyalty_rewards
  WHERE id = p_reward_id
    AND tenant_id = p_tenant_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REWARD_NOT_FOUND',
      'message', 'Recompensa no encontrada o inactiva'
    );
  END IF;

  -- Step 2: Check validity dates
  IF v_reward.valid_from IS NOT NULL AND v_reward.valid_from > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_YET_VALID',
      'message', 'Esta recompensa aún no está disponible'
    );
  END IF;

  IF v_reward.valid_to IS NOT NULL AND v_reward.valid_to < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EXPIRED',
      'message', 'Esta recompensa ha expirado'
    );
  END IF;

  -- Step 3: Check stock (with lock)
  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OUT_OF_STOCK',
      'message', 'Esta recompensa está agotada'
    );
  END IF;

  -- Step 4: Check max per user (with lock on user's redemptions)
  IF v_reward.max_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_redemption_count
    FROM loyalty_redemptions
    WHERE user_id = p_user_id
      AND reward_id = p_reward_id
      AND status IN ('pending', 'approved', 'used')
    FOR UPDATE;

    IF v_user_redemption_count >= v_reward.max_per_user THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'MAX_REDEMPTIONS_REACHED',
        'message', format('Ya has canjeado esta recompensa el máximo de %s veces', v_reward.max_per_user)
      );
    END IF;
  END IF;

  -- Step 5: Calculate user's points balance
  -- Get target pet ID
  v_target_pet_id := p_pet_id;
  IF v_target_pet_id IS NULL THEN
    SELECT id INTO v_target_pet_id
    FROM pets
    WHERE owner_id = p_user_id
    LIMIT 1;
  END IF;

  IF v_target_pet_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_PET_FOUND',
      'message', 'No se encontró una mascota asociada'
    );
  END IF;

  -- Sum all points for user's pets (lock for update)
  SELECT COALESCE(SUM(lt.points), 0) INTO v_points_balance
  FROM loyalty_transactions lt
  JOIN pets p ON lt.pet_id = p.id
  WHERE p.owner_id = p_user_id
  FOR UPDATE OF lt;

  IF v_points_balance < v_reward.points_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_POINTS',
      'message', format('Puntos insuficientes. Tienes %s puntos, necesitas %s', v_points_balance, v_reward.points_cost),
      'current_balance', v_points_balance,
      'required', v_reward.points_cost
    );
  END IF;

  -- Step 6: All checks passed - create redemption
  v_expires_at := NOW() + INTERVAL '30 days';

  INSERT INTO loyalty_redemptions (
    tenant_id,
    reward_id,
    user_id,
    pet_id,
    points_spent,
    status,
    redemption_code,
    expires_at,
    created_at
  )
  VALUES (
    p_tenant_id,
    p_reward_id,
    p_user_id,
    v_target_pet_id,
    v_reward.points_cost,
    'approved',
    p_redemption_code,
    v_expires_at,
    NOW()
  )
  RETURNING id INTO v_redemption_id;

  -- Step 7: Deduct points atomically
  INSERT INTO loyalty_transactions (
    clinic_id,
    pet_id,
    points,
    description,
    created_by,
    created_at
  )
  VALUES (
    p_tenant_id,
    v_target_pet_id,
    -v_reward.points_cost,
    'Canje: ' || v_reward.name,
    p_user_id,
    NOW()
  );

  -- Step 8: Decrement stock if applicable
  IF v_reward.stock IS NOT NULL THEN
    UPDATE loyalty_rewards
    SET stock = stock - 1,
        updated_at = NOW()
    WHERE id = p_reward_id;
  END IF;

  -- Return success with redemption details
  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'redemption_code', p_redemption_code,
    'reward_name', v_reward.name,
    'points_spent', v_reward.points_cost,
    'expires_at', v_expires_at,
    'new_balance', v_points_balance - v_reward.points_cost
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error rolls back the entire transaction
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION redeem_loyalty_reward TO authenticated;

COMMENT ON FUNCTION redeem_loyalty_reward IS 'Atomically redeems a loyalty reward. Checks stock, max per user, and points balance with proper locking to prevent race conditions.';
