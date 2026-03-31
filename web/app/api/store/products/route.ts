import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ProductListResponse,
  ProductListItem,
  AvailableFilters,
  SortOption,
} from '@/lib/types/store'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

// Schema for creating a new product
const createProductSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  short_description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  base_price: z.number().min(0, 'Precio debe ser positivo'),
  sale_price: z.number().min(0).optional(),
  purchase_unit: z.string().optional(),
  sale_unit: z.string().optional(),
  conversion_factor: z.number().min(0).optional(),
  image_url: z.string().url().optional().nullable(),
  is_prescription_required: z.boolean().optional(),
  is_active: z.boolean().optional(),
  initial_stock: z.number().min(0).optional(),
  reorder_point: z.number().min(0).optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clinic = searchParams.get('clinic')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '12', 10)
  const sort = (searchParams.get('sort') || 'relevance') as SortOption
  const search = searchParams.get('search')
  const category = searchParams.get('category')
  // ... and so on for all filters

  if (!clinic) {
    return apiError('MISSING_FIELDS', HTTP_STATUS.BAD_REQUEST, {
      details: { message: 'Clinic not provided' },
    })
  }

  const supabase = await createClient()


  try {
    // Step 1: Get clinic product assignments with pagination applied at DB level
    // Calculate offset for pagination
    const offset = (page - 1) * limit

    const {
      data: assignments,
      error: assignError,
      count: totalAssignments,
    } = await supabase
      .from('clinic_product_assignments')
      .select(
        'id, catalog_product_id, sale_price, min_stock_level, requires_prescription, is_active',
        { count: 'exact' }
      )
      .eq('tenant_id', clinic)
      .eq('is_active', true)
      .range(offset, offset + limit - 1)

    if (assignError) {
      throw assignError
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        products: [],
        pagination: { page, limit, pages: Math.ceil((totalAssignments || 0) / limit), total: totalAssignments || 0, hasNext: false, hasPrev: page > 1 },
        filters: {
          applied: {},
          available: {
            categories: [],
            subcategories: [],
            brands: [],
            species: [],
            life_stages: [],
            breed_sizes: [],
            health_conditions: [],
            price_range: { min: 0, max: 1000000 },
          },
        },
      })
    }

    // Step 2: Get product details for assigned products (already paginated, so limited set)
    const productIds = assignments.map((a) => a.catalog_product_id)

    // Fetch products in batches if needed to avoid header overflow
    let productQuery = supabase
      .from('store_products')
      .select(
        `
        id, sku, name, description, short_description, base_price, image_url,
        target_species, is_active, created_at,
        store_inventory (stock_quantity),
        store_brands (id, name, slug),
        store_categories (id, name, slug)
      `
      )
      .in('id', productIds)
      .eq('is_active', true)
      .is('deleted_at', null)

    // Apply search filter
    if (search) {
      productQuery = productQuery.ilike('name', `%${search}%`)
    }

    // Apply category filter
    if (category) {
      productQuery = productQuery.eq('store_categories.slug', category)
    }

    // Apply sorting
    switch (sort) {
      case 'price_low_high':
        productQuery = productQuery.order('base_price', { ascending: true })
        break
      case 'price_high_low':
        productQuery = productQuery.order('base_price', { ascending: false })
        break
      case 'name_asc':
        productQuery = productQuery.order('name', { ascending: true })
        break
      case 'newest':
        productQuery = productQuery.order('created_at', { ascending: false })
        break
      default:
        productQuery = productQuery.order('name', { ascending: true })
        break
    }

    const { data: productData, error: productError } = await productQuery

    if (productError) {
      throw productError
    }

    // Create assignment lookup map
    const assignmentMap = new Map(assignments.map((a) => [a.catalog_product_id, a]))

    // Merge products with assignment data and apply pagination
    const allProducts = (productData || []).map((product) => {
      const assignment = assignmentMap.get(product.id)
      const inventory = Array.isArray(product.store_inventory)
        ? product.store_inventory[0]
        : product.store_inventory
      // Handle array-like results from joins - Supabase returns arrays for one-to-many joins
      const brand = Array.isArray(product.store_brands)
        ? product.store_brands[0]
        : product.store_brands
      const categoryData = Array.isArray(product.store_categories)
        ? product.store_categories[0]
        : product.store_categories

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        short_description: product.short_description,
        base_price: product.base_price,
        sale_price: assignment?.sale_price,
        current_price: assignment?.sale_price || product.base_price,
        image_url: product.image_url,
        target_species: product.target_species,
        is_prescription_required: assignment?.requires_prescription || false,
        stock_quantity: inventory?.stock_quantity || 0,
        is_active: true,
        brand: brand ? { id: brand.id, name: brand.name, slug: brand.slug } : null,
        category: categoryData
          ? { id: categoryData.id, name: categoryData.name, slug: categoryData.slug }
          : null,
      }
    })

    // Pagination is now applied at DB level, use total from assignments count
    const totalPages = Math.ceil((totalAssignments || 0) / limit)

    // In a real app, available filters would be calculated based on the full product set, not just the current page
    const availableFilters: AvailableFilters = {
      categories: [],
      subcategories: [],
      brands: [],
      species: [],
      life_stages: [],
      breed_sizes: [],
      health_conditions: [],
      price_range: { min: 0, max: 1000000 },
    }

    const response: ProductListResponse = {
      products: allProducts as ProductListItem[],
      pagination: {
        page,
        limit,
        pages: totalPages,
        total: totalAssignments || 0,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        applied: {}, // This would be the filters from searchParams
        available: availableFilters,
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const err = error as { message?: string; code?: string; details?: string; hint?: string }
    logger.error('Error fetching store products', {
      tenantId: clinic,
      errorMessage: err.message,
      errorCode: err.code,
      errorDetails: err.details,
      errorHint: err.hint,
    })
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      details: { message: err.message || 'Error loading products' },
    })
  }
}

/**
 * POST /api/store/products
 * Create a new product (staff only)
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  // Get user's profile and verify staff role
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, {
      details: { message: 'Perfil no encontrado' },
    })
  }

  if (profile.role !== 'vet' && profile.role !== 'admin') {
    return apiError('INSUFFICIENT_ROLE', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Solo personal autorizado puede crear productos' },
    })
  }

  try {
    const body = await request.json()
    const validation = createProductSchema.safeParse(body)

    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
      })
    }

    const data = validation.data

    // Create product
    const { data: product, error: productError } = await supabase
      .from('store_products')
      .insert({
        tenant_id: profile.tenant_id,
        name: data.name,
        description: data.description,
        short_description: data.short_description,
        sku: data.sku,
        barcode: data.barcode,
        category_id: data.category_id,
        brand_id: data.brand_id,
        base_price: data.base_price,
        sale_price: data.sale_price,
        current_price: data.sale_price ?? data.base_price,
        purchase_unit: data.purchase_unit || 'Unidad',
        sale_unit: data.sale_unit || 'Unidad',
        conversion_factor: data.conversion_factor || 1,
        image_url: data.image_url,
        is_prescription_required: data.is_prescription_required || false,
        is_active: data.is_active ?? true,
      })
      .select()
      .single()

    if (productError) {
      logger.error('Error creating product', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: productError instanceof Error ? productError.message : String(productError),
      })
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: 'Error al crear producto' },
      })
    }

    // Create initial inventory record if stock provided
    if (data.initial_stock !== undefined || data.reorder_point !== undefined) {
      const { error: inventoryError } = await supabase.from('store_inventory').insert({
        tenant_id: profile.tenant_id,
        product_id: product.id,
        stock_quantity: data.initial_stock ?? 0,
        reorder_point: data.reorder_point ?? 5,
      })

      if (inventoryError) {
        logger.error('Error creating inventory', {
          tenantId: profile.tenant_id,
          productId: product.id,
          error: inventoryError instanceof Error ? inventoryError.message : String(inventoryError),
        })
        // Don't fail the whole operation, product was created
      }
    }

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error in product creation', {
      tenantId: profile?.tenant_id,
      userId: user?.id,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
