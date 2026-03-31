'use server'

import { withActionAuth, actionError } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { FieldErrors } from '@/lib/types/action-result'
import { z } from 'zod'
import { logger } from '@/lib/logger'

/**
 * REF-005: Migrated to withActionAuth
 */

// Species categories for products
const SPECIES_CATEGORIES = ['dog', 'cat', 'exotic', 'other'] as const

// Validation schema for updating a product
const updateProductSchema = z.object({
  id: z.string().uuid('ID de producto inválido'),

  name: z
    .string()
    .min(1, 'El nombre del producto es obligatorio')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .transform((val) => val.trim()),

  category: z.enum(SPECIES_CATEGORIES, {
    message: 'Selecciona una categoría válida',
  }),

  price: z
    .string()
    .min(1, 'El precio es obligatorio')
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val), { message: 'Ingresa un precio válido' })
    .refine((val) => val > 0, { message: 'El precio debe ser mayor a 0' })
    .refine((val) => val <= 99999999, { message: 'El precio es demasiado alto' }),

  stock: z
    .string()
    .min(1, 'El stock es obligatorio')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), { message: 'Ingresa un número válido' })
    .refine((val) => val >= 0, { message: 'El stock no puede ser negativo' })
    .refine((val) => val <= 999999, { message: 'El stock es demasiado alto' }),

  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .transform((val) => val?.trim() || null),

  sku: z
    .string()
    .max(50, 'El código SKU no puede exceder 50 caracteres')
    .optional()
    .transform((val) => val?.trim() || null),
})

export const updateProduct = withActionAuth(
  async ({ user, profile, supabase }, _prevState: unknown, formData: FormData) => {
    const clinic = formData.get('clinic') as string

    // Extract form data
    const rawData = {
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      price: formData.get('price') as string,
      stock: formData.get('stock') as string,
      description: formData.get('description') as string,
      sku: formData.get('sku') as string,
    }

    // Validate
    const validation = updateProductSchema.safeParse(rawData)

    if (!validation.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message
        }
      }

      return {
        success: false as const,
        error: 'Por favor, revisa los campos marcados en rojo.',
        fieldErrors,
      }
    }

    const validData = validation.data

    // Check product exists and belongs to this tenant
    const { data: existingProduct, error: fetchError } = await supabase
      .from('store_products')
      .select('id, tenant_id')
      .eq('id', validData.id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingProduct) {
      return actionError('Producto no encontrado.')
    }

    if (existingProduct.tenant_id !== profile.tenant_id) {
      return actionError('No tienes permiso para editar este producto.')
    }

    // Check for duplicate SKU if provided (excluding current product)
    if (validData.sku) {
      const { data: existingSku } = await supabase
        .from('store_products')
        .select('id, name')
        .eq('sku', validData.sku)
        .eq('tenant_id', profile.tenant_id)
        .neq('id', validData.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (existingSku) {
        return {
          success: false as const,
          error: 'Este código SKU ya está en uso.',
          fieldErrors: {
            sku: `El código "${validData.sku}" ya está asignado al producto "${existingSku.name}".`,
          },
        }
      }
    }

    // Handle Photo Upload
    const photo = formData.get('photo') as File
    let imageUrl: string | undefined = undefined

    if (photo && photo.size > 0) {
      // Validate file size (5MB max)
      if (photo.size > 5 * 1024 * 1024) {
        return {
          success: false as const,
          error: 'La imagen es demasiado grande.',
          fieldErrors: {
            photo: `La imagen debe pesar menos de 5MB. Tu archivo pesa ${(photo.size / 1024 / 1024).toFixed(1)}MB.`,
          },
        }
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(photo.type)) {
        return {
          success: false as const,
          error: 'Formato de imagen no soportado.',
          fieldErrors: {
            photo: 'Solo se permiten imágenes JPG, PNG, GIF o WebP.',
          },
        }
      }

      const fileExt = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `products/${profile.tenant_id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('products').upload(fileName, photo)

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('products').getPublicUrl(fileName)
        imageUrl = publicUrl
      } else {
        logger.warn('Product image upload failed', {
          error: uploadError.message,
          tenantId: profile.tenant_id,
        })
      }
    }

    // Map category to target_species array
    const targetSpecies = validData.category === 'other' ? [] : [validData.category]

    // Build update object for store_products
    const updateData: Record<string, unknown> = {
      name: validData.name,
      description: validData.description,
      short_description: validData.description?.substring(0, 150) || null,
      base_price: validData.price,
      sku: validData.sku,
      target_species: targetSpecies,
      updated_at: new Date().toISOString(),
    }

    // Only update image if a new one was uploaded
    if (imageUrl) {
      updateData.image_url = imageUrl
    }

    // Update Product in store_products
    const { error: updateError } = await supabase
      .from('store_products')
      .update(updateData)
      .eq('id', validData.id)
      .eq('tenant_id', profile.tenant_id)

    if (updateError) {
      logger.error('Update Product Error', {
        error: updateError.message,
        productId: validData.id,
        tenantId: profile.tenant_id,
        userId: user.id,
      })

      if (updateError.code === '23505') {
        if (updateError.message.includes('sku')) {
          return {
            success: false as const,
            error: 'Este código SKU ya está en uso.',
            fieldErrors: {
              sku: 'Elige otro código SKU para este producto.',
            },
          }
        }
        return actionError('Ya existe un producto con estos datos.')
      }

      return actionError('No se pudo actualizar el producto. Por favor, intenta de nuevo.')
    }

    // Update or create inventory record
    const { error: inventoryError } = await supabase.from('store_inventory').upsert(
      {
        product_id: validData.id,
        tenant_id: profile.tenant_id,
        stock_quantity: validData.stock,
      },
      {
        onConflict: 'product_id',
      }
    )

    if (inventoryError) {
      logger.warn('Failed to update inventory record', {
        error: inventoryError.message,
        productId: validData.id,
        tenantId: profile.tenant_id,
      })
      // Don't fail - product was updated, inventory can be set later
    }

    revalidatePath(`/${clinic}/portal/products`)
    revalidatePath(`/${clinic}/portal/products/${validData.id}`)
    revalidatePath(`/${clinic}/store`)
    redirect(`/${clinic}/portal/products?success=product_updated`)
  },
  { requireStaff: true }
)
