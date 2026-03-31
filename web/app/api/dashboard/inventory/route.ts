import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { isCategoryJoin, isBrandJoin } from '@/lib/utils/type-guards'
import { createLookup } from '@/lib/utils/map'

export type ProductSource = 'all' | 'own' | 'catalog'

interface InventoryProduct {
  id: string
  sku: string
  name: string
  short_description?: string
  description?: string
  image_url?: string
  base_price: number
  sale_price?: number
  category_id?: string
  category?: { id: string; name: string; slug: string }
  brand?: { id: string; name: string }
  inventory?: {
    stock_quantity: number
    min_stock_level?: number
    weighted_average_cost?: number
    expiry_date?: string
    batch_number?: string
  }
  is_active: boolean
  created_at: string
  source: 'own' | 'catalog'
  assignment?: {
    sale_price: number
    min_stock_level: number
    location?: string
    margin_percentage?: number
  }
}

/**
 * GET /api/dashboard/inventory
 * Unified inventory endpoint for dashboard with source filtering
 *
 * Query params:
 * - clinic: tenant_id (required)
 * - source: 'all' | 'own' | 'catalog' (default: 'all')
 * - search: search query (optional)
 * - category: category slug (optional)
 * - stock_status: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' (default: 'all')
 * - page: page number (default: 1)
 * - limit: items per page (default: 25)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')
  const source = (searchParams.get('source') || 'all') as ProductSource
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category')
  const stockStatus = searchParams.get('stock_status') || 'all'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '25', 10)

  if (!clinic) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Clinic parameter is required' },
    })
  }

  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // Verify user is staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tenant_id !== clinic) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED, {
      details: { message: 'No tiene acceso a este inventario' },
    })
  }

  if (profile.role !== 'vet' && profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Solo personal puede acceder al inventario' },
    })
  }

  try {
    const products: InventoryProduct[] = []
    const offset = (page - 1) * limit
    let totalCount = 0

    // Fetch clinic-owned products (source: 'own')
    if (source === 'all' || source === 'own') {
      let ownQuery = supabase
        .from('store_products')
        .select(
          `
          id,
          sku,
          name,
          short_description,
          description,
          image_url,
          base_price,
          sale_price,
          category_id,
          is_active,
          created_at,
          store_categories(id, name, slug),
          store_brands(id, name, slug)
        `,
          { count: 'exact' }
        )
        .eq('tenant_id', clinic)
        .eq('is_active', true)
        .is('deleted_at', null)

      if (search) {
        ownQuery = ownQuery.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
      }

      if (source === 'own') {
        ownQuery = ownQuery.range(offset, offset + limit - 1)
      }

      const {
        data: ownProducts,
        error: ownError,
        count: ownCount,
      } = await ownQuery.order('name', { ascending: true })

      if (ownError) {
        logger.error('Error fetching own products', { error: ownError, tenantId: clinic })
        throw ownError
      }

      if (source === 'own') {
        totalCount = ownCount || 0
      }

      // Get inventory for owned products
      const ownProductIds = ownProducts?.map((p) => p.id) || []
      const { data: ownInventory } = await supabase
        .from('store_inventory')
        .select(
          'product_id, stock_quantity, min_stock_level, weighted_average_cost, expiry_date, batch_number'
        )
        .eq('tenant_id', clinic)
        .in('product_id', ownProductIds)

      // Create type-safe inventory lookup map
      const inventoryMap = createLookup(ownInventory ?? [], (inv) => inv.product_id)

      ownProducts?.forEach((p) => {
        // Handle joined data with type guards - no unsafe casts
        const category = isCategoryJoin(p.store_categories) ? p.store_categories : undefined
        const brand = isBrandJoin(p.store_brands) ? p.store_brands : undefined
        const inv = inventoryMap.get(p.id)

        products.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          short_description: p.short_description,
          description: p.description,
          image_url: p.image_url,
          base_price: p.base_price,
          sale_price: p.sale_price,
          category_id: p.category_id,
          category,
          brand: brand ? { id: brand.id, name: brand.name } : undefined,
          is_active: p.is_active,
          created_at: p.created_at,
          source: 'own',
          inventory: inv
            ? {
                stock_quantity: inv.stock_quantity,
                min_stock_level: inv.min_stock_level,
                weighted_average_cost: inv.weighted_average_cost,
                expiry_date: inv.expiry_date,
                batch_number: inv.batch_number,
              }
            : undefined,
        })
      })
    }

    // Fetch catalog-assigned products (source: 'catalog')
    // Note: clinic_product_assignments table may not exist in all deployments
    if (source === 'all' || source === 'catalog') {
      // First get assignments for this clinic
      const { data: assignments, error: assignError } = await supabase
        .from('clinic_product_assignments')
        .select(
          `
          id,
          catalog_product_id,
          sale_price,
          min_stock_level,
          location,
          margin_percentage,
          is_active
        `
        )
        .eq('tenant_id', clinic)
        .eq('is_active', true)

      // If table doesn't exist or other error, just skip catalog products
      if (assignError) {
        // Check if it's a "relation does not exist" error (table not found)
        const errorMessage =
          typeof assignError === 'object' && assignError !== null
            ? JSON.stringify(assignError)
            : String(assignError)

        if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
          logger.warn('clinic_product_assignments table not found, skipping catalog products', {
            tenantId: clinic,
          })
          // Continue without catalog products
        } else {
          logger.error('Error fetching assignments', { error: errorMessage, tenantId: clinic })
          // Don't throw - just continue without catalog products
        }
      }

      const catalogProductIds =
        assignments && !assignError ? assignments.map((a) => a.catalog_product_id) : []

      if (catalogProductIds.length > 0 && !assignError) {
        // Fetch the catalog products
        let catalogQuery = supabase
          .from('store_products')
          .select(
            `
            id,
            sku,
            name,
            short_description,
            description,
            image_url,
            base_price,
            category_id,
            is_active,
            created_at,
            store_categories(id, name, slug),
            store_brands(id, name, slug)
          `,
            { count: 'exact' }
          )
          .in('id', catalogProductIds)
          .is('tenant_id', null)
          .eq('is_global_catalog', true)
          .eq('is_active', true)

        if (search) {
          catalogQuery = catalogQuery.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
        }

        if (source === 'catalog') {
          catalogQuery = catalogQuery.range(offset, offset + limit - 1)
        }

        const {
          data: catalogProducts,
          error: catalogError,
          count: catalogCount,
        } = await catalogQuery.order('name', { ascending: true })

        if (catalogError) {
          logger.error('Error fetching catalog products', { error: catalogError, tenantId: clinic })
          throw catalogError
        }

        if (source === 'catalog') {
          totalCount = catalogCount || 0
        }

        // Get inventory for catalog products
        const { data: catalogInventory } = await supabase
          .from('store_inventory')
          .select(
            'product_id, stock_quantity, min_stock_level, weighted_average_cost, expiry_date, batch_number'
          )
          .eq('tenant_id', clinic)
          .in('product_id', catalogProductIds)

        // Create type-safe lookup maps
        const catalogInventoryMap = createLookup(catalogInventory ?? [], (inv) => inv.product_id)
        const assignmentMap = createLookup(assignments ?? [], (a) => a.catalog_product_id)

        catalogProducts?.forEach((p) => {
          const assignment = assignmentMap.get(p.id)
          // Handle joined data with type guards - no unsafe casts
          const category = isCategoryJoin(p.store_categories) ? p.store_categories : undefined
          const brand = isBrandJoin(p.store_brands) ? p.store_brands : undefined
          const inv = catalogInventoryMap.get(p.id)

          products.push({
            id: p.id,
            sku: p.sku,
            name: p.name,
            short_description: p.short_description,
            description: p.description,
            image_url: p.image_url,
            base_price: p.base_price,
            sale_price: assignment?.sale_price,
            category_id: p.category_id,
            category,
            brand: brand ? { id: brand.id, name: brand.name } : undefined,
            is_active: p.is_active,
            created_at: p.created_at,
            source: 'catalog',
            assignment: {
              sale_price: assignment?.sale_price || 0,
              min_stock_level: assignment?.min_stock_level || 5,
              location: assignment?.location,
              margin_percentage: assignment?.margin_percentage,
            },
            inventory: inv
              ? {
                  stock_quantity: inv.stock_quantity,
                  min_stock_level: inv.min_stock_level,
                  weighted_average_cost: inv.weighted_average_cost,
                  expiry_date: inv.expiry_date,
                  batch_number: inv.batch_number,
                }
              : undefined,
          })
        })
      }
    }

    // For 'all' source, we need to paginate the combined results
    let paginatedProducts = products
    if (source === 'all') {
      totalCount = products.length
      // Sort by name
      paginatedProducts = products
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .slice(offset, offset + limit)
    }

    // Apply stock status filter (locally after fetching)
    if (stockStatus !== 'all') {
      const filteredProducts = paginatedProducts.filter((p) => {
        const stock = p.inventory?.stock_quantity ?? 0
        const minStock = p.inventory?.min_stock_level ?? p.assignment?.min_stock_level ?? 5

        switch (stockStatus) {
          case 'in_stock':
            return stock > minStock
          case 'low_stock':
            return stock > 0 && stock <= minStock
          case 'out_of_stock':
            return stock === 0
          default:
            return true
        }
      })

      return NextResponse.json({
        products: filteredProducts,
        pagination: {
          page,
          limit,
          total: filteredProducts.length,
          pages: Math.ceil(filteredProducts.length / limit),
          hasNext: page < Math.ceil(filteredProducts.length / limit),
          hasPrev: page > 1,
        },
        source,
        summary: {
          own: source === 'all' ? products.filter((p) => p.source === 'own').length : undefined,
          catalog:
            source === 'all' ? products.filter((p) => p.source === 'catalog').length : undefined,
        },
      })
    }

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
      source,
      summary: {
        own: source === 'all' ? products.filter((p) => p.source === 'own').length : undefined,
        catalog:
          source === 'all' ? products.filter((p) => p.source === 'catalog').length : undefined,
      },
    })
  } catch (error) {
    logger.error('Dashboard inventory API error', {
      error: error instanceof Error ? error.message : 'Unknown',
      tenantId: clinic,
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: 'Error al cargar el inventario' },
    })
  }
}
