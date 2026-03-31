import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import { catalogAssignSchema } from '@/lib/schemas/inventory'

/**
 * POST /api/inventory/catalog/assign
 * Assign a global catalog product to a clinic
 *
 * Body:
 * - catalog_product_id: UUID of global catalog product
 * - clinic_id: tenant_id of clinic
 * - sale_price: Clinic's selling price
 * - min_stock_level?: Minimum stock level (optional)
 * - location?: Storage location (optional)
 * - initial_stock?: Initial stock quantity (optional)
 * - requires_prescription?: Override prescription requirement (optional)
 */
export const POST = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    try {
      const rawBody = await request.json()
      
      // Validate with Zod
      const validation = catalogAssignSchema.safeParse(rawBody)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { issues: validation.error.issues },
        })
      }

      const {
        catalog_product_id,
        clinic_id,
        sale_price,
        min_stock_level,
        location,
        initial_stock,
        requires_prescription,
      } = validation.data

      // Verify user can assign to this clinic
      if (profile.tenant_id !== clinic_id) {
        return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
      }

      // Verify the product exists in global catalog
      const { data: product, error: productError } = await supabase
        .from('store_products')
        .select('id, name, sku, base_price')
        .eq('id', catalog_product_id)
        .is('tenant_id', null)
        .eq('is_global_catalog', true)
        .eq('is_active', true)
        .single()

      if (productError || !product) {
        return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
          details: { resource: 'catalog_product' },
        })
      }

      // Start transaction - assign product to clinic
      const { data: assignment, error: assignmentError } = await supabase
        .from('clinic_product_assignments')
        .upsert(
          {
            tenant_id: clinic_id,
            catalog_product_id: catalog_product_id,
            sale_price: sale_price,
            min_stock_level: min_stock_level || 5,
            location: location || null,
            requires_prescription: requires_prescription,
            is_active: true,
          },
          {
            onConflict: 'tenant_id,catalog_product_id',
          }
        )
        .select()
        .single()

      if (assignmentError) {
        logger.error('Product assignment error', {
          tenantId: profile.tenant_id,
          userId: user.id,
          catalogProductId: catalog_product_id,
          error: assignmentError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // If initial stock is provided, create inventory record
      if (initial_stock && initial_stock > 0) {
        const { error: inventoryError } = await supabase.from('store_inventory').upsert(
          {
            product_id: catalog_product_id,
            tenant_id: clinic_id,
            stock_quantity: initial_stock,
            min_stock_level: min_stock_level || 5,
            location: location || null,
            weighted_average_cost: product.base_price || 0,
          },
          {
            onConflict: 'product_id',
          }
        )

        if (inventoryError) {
          logger.error('Inventory creation error', {
            tenantId: profile.tenant_id,
            userId: user.id,
            catalogProductId: catalog_product_id,
            error: inventoryError.message,
          })
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
            details: { message: 'Producto asignado pero error al crear inventario inicial' },
          })
        }

        // Create inventory transaction record
        await supabase.from('store_inventory_transactions').insert({
          tenant_id: clinic_id,
          product_id: catalog_product_id,
          type: 'purchase',
          quantity: initial_stock,
          unit_cost: product.base_price || 0,
          notes: 'Stock inicial al asignar producto del catálogo',
        })
      }

      // Return success with assignment details
      return NextResponse.json({
        success: true,
        message: 'Producto asignado exitosamente a la clínica',
        assignment: {
          id: assignment.id,
          catalog_product_id: assignment.catalog_product_id,
          sale_price: assignment.sale_price,
          min_stock_level: assignment.min_stock_level,
          location: assignment.location,
          requires_prescription: assignment.requires_prescription,
          initial_stock: initial_stock || 0,
        },
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          base_price: product.base_price,
        },
      })
    } catch (error) {
      logger.error('Assign product API error', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
