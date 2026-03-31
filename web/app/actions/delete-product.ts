'use server'

import { withActionAuth, actionError, actionSuccess } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

/**
 * REF-005: Migrated to withActionAuth
 */
export const deleteProduct = withActionAuth(
  async ({ user, profile, supabase }, productId: string, clinic: string) => {
    // Check product exists and belongs to this tenant
    const { data: existingProduct, error: fetchError } = await supabase
      .from('store_products')
      .select('id, tenant_id, name, image_url')
      .eq('id', productId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingProduct) {
      return actionError('Producto no encontrado.')
    }

    if (existingProduct.tenant_id !== profile.tenant_id) {
      return actionError('No tienes permiso para eliminar este producto.')
    }

    // Soft delete the product (set deleted_at)
    const { error: deleteError } = await supabase
      .from('store_products')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        is_active: false,
      })
      .eq('id', productId)
      .eq('tenant_id', profile.tenant_id)

    if (deleteError) {
      logger.error('Delete Product Error', {
        error: deleteError.message,
        productId,
        tenantId: profile.tenant_id,
        userId: user.id,
      })

      // Check for foreign key constraint (product might be referenced in orders, etc.)
      if (deleteError.code === '23503') {
        return actionError(
          'No se puede eliminar este producto porque está siendo utilizado en pedidos u otros registros.'
        )
      }

      return actionError('No se pudo eliminar el producto. Por favor, intenta de nuevo.')
    }

    // Try to delete the image from storage (non-blocking)
    if (existingProduct.image_url) {
      try {
        const urlParts = existingProduct.image_url.split('/')
        const fileName = urlParts.slice(-3).join('/') // products/tenant_id/timestamp.ext
        await supabase.storage.from('products').remove([fileName])
      } catch (e: unknown) {
        // Log but continue - image cleanup is non-critical, product is already deleted
        logger.warn('Failed to delete product image', {
          error: e instanceof Error ? e.message : 'Unknown error',
          productId,
          imageUrl: existingProduct.image_url,
        })
      }
    }

    revalidatePath(`/${clinic}/portal/products`)
    revalidatePath(`/${clinic}/store`)

    return actionSuccess()
  },
  { requireStaff: true }
)
