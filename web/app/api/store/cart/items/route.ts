import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/store/cart/items
 * Add or update a cart item with stock reservation
 */
export const POST = withApiAuth(async ({ supabase, user, profile, log, request }: ApiHandlerContext) => {
  const requestData = await request.json()
  const { productId, quantity, clinic } = requestData || {}

  if (!productId || typeof quantity !== 'number' || quantity < 0) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Producto y cantidad requeridos' },
    })
  }

  // Use provided clinic or fall back to user's tenant
  const tenantId = clinic || profile.tenant_id

  log.info('Cart item operation', {
    action: 'cart.update_item',
    productId,
    quantity,
    tenantId,
  })

  // Get or create cart
  const { data: cart } = await supabase
    .from('store_carts')
    .select('id, items')
    .eq('customer_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  let cartId: string

  if (!cart) {
    // Create new cart
    const { data: newCart, error: createError } = await supabase
      .from('store_carts')
      .insert({
        customer_id: user.id,
        tenant_id: tenantId,
        items: [],
      })
      .select('id')
      .single()

    if (createError || !newCart) {
      log.error('Error creating cart', { error: createError })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al crear carrito' },
      })
    }
    cartId = newCart.id
    log.info('Created new cart', { cartId })
  } else {
    cartId = cart.id
  }

  // Try to reserve stock using the RPC function
  if (quantity > 0) {
    const { data: reserveResult, error: reserveError } = await supabase.rpc('reserve_stock', {
      p_tenant_id: tenantId,
      p_cart_id: cartId,
      p_product_id: productId,
      p_quantity: quantity,
    })

    if (reserveError) {
      log.error('Error reserving stock', { error: reserveError })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al reservar stock' },
      })
    }

    if (!reserveResult?.success) {
      log.warn('Stock reservation failed', {
        productId,
        requestedQty: quantity,
        available: reserveResult?.available,
      })
      return NextResponse.json(
        {
          success: false,
          error: reserveResult?.error || 'Stock insuficiente',
          available: reserveResult?.available,
        },
        { status: 400 }
      )
    }
  } else {
    // Release reservation when quantity is 0
    const { error: releaseError } = await supabase.rpc('release_reservation', {
      p_cart_id: cartId,
      p_product_id: productId,
    })

    if (releaseError) {
      log.error('Error releasing reservation', { error: releaseError })
    }
  }

  // Update cart items
  const currentItems = (cart?.items as Array<{ id: string; quantity: number; type: string }>) || []
  const updatedItems = [...currentItems]

  const existingIndex = updatedItems.findIndex((item) => item.id === productId)

  if (quantity === 0) {
    // Remove item
    if (existingIndex !== -1) {
      updatedItems.splice(existingIndex, 1)
    }
  } else if (existingIndex !== -1) {
    // Update quantity
    updatedItems[existingIndex].quantity = quantity
  } else {
    // Add new item
    updatedItems.push({ id: productId, quantity, type: 'product' })
  }

  // Save updated cart
  const { error: updateError } = await supabase
    .from('store_carts')
    .update({
      items: updatedItems,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cartId)

  if (updateError) {
    log.error('Error updating cart', { error: updateError })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al actualizar carrito' },
    })
  }

  log.info('Cart updated successfully', {
    cartId,
    itemCount: updatedItems.length,
    productId,
    newQuantity: quantity,
  })

  return NextResponse.json({
    success: true,
    items: updatedItems,
    reserved: quantity,
  })
})

/**
 * DELETE /api/store/cart/items
 * Remove item from cart and release reservation
 */
export const DELETE = withApiAuth(async ({ supabase, user, profile, log, request }: ApiHandlerContext) => {
  const requestData = await request.json()
  const { productId, clinic } = requestData || {}

  if (!productId) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Producto requerido' },
    })
  }

  // Use provided clinic or fall back to user's tenant
  const tenantId = clinic || profile.tenant_id

  log.info('Cart item removal', {
    action: 'cart.remove_item',
    productId,
    tenantId,
  })

  // Get cart
  const { data: cart } = await supabase
    .from('store_carts')
    .select('id, items')
    .eq('customer_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!cart) {
    return NextResponse.json({ success: true, message: 'Cart not found' })
  }

  // Release reservation
  await supabase.rpc('release_reservation', {
    p_cart_id: cart.id,
    p_product_id: productId,
  })

  // Update cart items
  const currentItems = (cart.items as Array<{ id: string; quantity: number; type: string }>) || []
  const updatedItems = currentItems.filter((item) => item.id !== productId)

  // Save updated cart
  const { error: updateError } = await supabase
    .from('store_carts')
    .update({
      items: updatedItems,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cart.id)

  if (updateError) {
    log.error('Error updating cart', { error: updateError })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al actualizar carrito' },
    })
  }

  log.info('Cart item removed', {
    cartId: cart.id,
    productId,
    remainingItems: updatedItems.length,
  })

  return NextResponse.json({
    success: true,
    items: updatedItems,
  })
})
