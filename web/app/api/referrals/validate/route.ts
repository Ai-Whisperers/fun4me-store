/**
 * Referral Code Validation API
 *
 * GET /api/referrals/validate?code=XXX - Validate a referral code (public endpoint)
 *
 * Used during signup flow to check if a referral code is valid.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json(
      { valid: false, error: 'Código requerido' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Look up the code
  const { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select(`
      id,
      code,
      is_active,
      times_used,
      max_uses,
      referred_trial_bonus_days,
      referred_loyalty_points,
      expires_at,
      tenant:tenant_id (
        id,
        name
      )
    `)
    .eq('code', code.toUpperCase())
    .single()

  if (error || !referralCode) {
    return NextResponse.json({
      valid: false,
      error: 'Código no encontrado',
    })
  }

  // Check if code is active
  if (!referralCode.is_active) {
    return NextResponse.json({
      valid: false,
      error: 'Este código ya no está activo',
    })
  }

  // Check if code has expired
  if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
    return NextResponse.json({
      valid: false,
      error: 'Este código ha expirado',
    })
  }

  // Check if code has reached max uses
  if (referralCode.max_uses && referralCode.times_used >= referralCode.max_uses) {
    return NextResponse.json({
      valid: false,
      error: 'Este código ha alcanzado el límite de usos',
    })
  }

  // Code is valid
  const rawTenantData = referralCode.tenant
  const tenantData = (Array.isArray(rawTenantData) ? rawTenantData[0] : rawTenantData) as { id: string; name: string } | null

  return NextResponse.json({
    valid: true,
    code: referralCode.code,
    referrer: {
      id: tenantData?.id,
      name: tenantData?.name,
    },
    benefits: {
      trial_bonus_days: referralCode.referred_trial_bonus_days,
      loyalty_points: referralCode.referred_loyalty_points,
      description: `${referralCode.referred_trial_bonus_days} días extra de prueba + ${referralCode.referred_loyalty_points} puntos de bienvenida`,
    },
  })
}
