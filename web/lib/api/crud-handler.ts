/**
 * Generic CRUD Handler Factory
 *
 * Creates standardized REST API handlers for database tables with:
 * - Automatic tenant isolation (tenant_id filtering)
 * - Zod schema validation
 * - Standardized error responses
 * - Pagination support
 * - Soft delete support
 * - Role-based access control
 *
 * @example
 * ```typescript
 * // api/suppliers/route.ts
 * import { createCrudHandler } from '@/lib/api/crud-handler'
 * import { supplierSchema, updateSupplierSchema } from '@/lib/schemas/supplier'
 *
 * const { GET, POST, PUT, DELETE } = createCrudHandler({
 *   table: 'suppliers',
 *   schemas: {
 *     create: supplierSchema,
 *     update: updateSupplierSchema,
 *   },
 *   roles: {
 *     read: ['owner', 'vet', 'admin'],
 *     write: ['admin'],
 *   },
 *   defaultSelect: '*, contact_info',
 *   searchFields: ['name', 'email'],
 * })
 *
 * export { GET, POST, PUT, DELETE }
 * ```
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiAuth, withApiAuthParams, type ApiHandlerContext, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import type { UserRole } from '@/lib/auth/types'
import type { RateLimitType } from '@/lib/rate-limit'

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface CrudHandlerOptions<
  TCreate extends z.ZodTypeAny = z.ZodTypeAny,
  TUpdate extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
> {
  /** Database table name */
  table: string

  /** Zod schemas for validation */
  schemas?: {
    create?: TCreate
    update?: TUpdate
    query?: TQuery
  }

  /** Role-based access control */
  roles?: {
    read?: UserRole[]
    write?: UserRole[]
    delete?: UserRole[]
  }

  /** Default select columns (can include relations) */
  defaultSelect?: string

  /** Fields to search when ?search= is provided */
  searchFields?: string[]

  /** Enable soft delete (filter by deleted_at IS NULL) */
  softDelete?: boolean

  /** Primary key column (defaults to 'id') */
  primaryKey?: string

  /** Foreign key to filter by (e.g., 'pet_id' for records belonging to a pet) */
  filterKey?: string

  /** Rate limit type */
  rateLimit?: {
    read?: RateLimitType
    write?: RateLimitType
  }

  /** Custom handlers for lifecycle hooks */
  hooks?: {
    beforeCreate?: (data: z.infer<TCreate>, ctx: ApiHandlerContext) => Promise<z.infer<TCreate>>
    afterCreate?: (
      record: Record<string, unknown>,
      ctx: ApiHandlerContext
    ) => Promise<Record<string, unknown>>
    beforeUpdate?: (
      id: string,
      data: z.infer<TUpdate>,
      ctx: ApiHandlerContext
    ) => Promise<z.infer<TUpdate>>
    afterUpdate?: (
      record: Record<string, unknown>,
      ctx: ApiHandlerContext
    ) => Promise<Record<string, unknown>>
    beforeDelete?: (id: string, ctx: ApiHandlerContext) => Promise<boolean>
    afterDelete?: (id: string, ctx: ApiHandlerContext) => Promise<void>
  }

  /** Custom query builder modifier */
  queryModifier?: (
    query: ReturnType<ApiHandlerContext['supabase']['from']>,
    ctx: ApiHandlerContext
  ) => ReturnType<ApiHandlerContext['supabase']['from']>

  /** Default ordering */
  orderBy?: {
    column: string
    ascending?: boolean
  }

  /** Maximum items per page */
  maxLimit?: number
}

// =============================================================================
// PAGINATION HELPER
// =============================================================================

const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export function getPagination(searchParams: URLSearchParams, maxLimit = 100): PaginationParams {
  const result = paginationSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  const page = result.success ? result.data.page : 0
  const limit = result.success ? Math.min(result.data.limit, maxLimit) : 20

  return {
    page,
    limit,
    offset: page * limit,
  }
}

// =============================================================================
// CRUD HANDLER FACTORY
// =============================================================================

export function createCrudHandler<
  TCreate extends z.ZodTypeAny = z.ZodTypeAny,
  TUpdate extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
>(options: CrudHandlerOptions<TCreate, TUpdate, TQuery>) {
  const {
    table,
    schemas,
    roles,
    defaultSelect = '*',
    searchFields = [],
    softDelete = true,
    primaryKey = 'id',
    filterKey,
    rateLimit: rateLimitConfig,
    hooks,
    queryModifier,
    orderBy = { column: 'created_at', ascending: false },
    maxLimit = 100,
  } = options

  // ---------------------------------------------------------------------------
  // GET Handler - List/Read
  // ---------------------------------------------------------------------------
  const GET = withApiAuth(
    async (ctx: ApiHandlerContext) => {
      const { supabase, profile, request } = ctx
      const searchParams = new URL(request.url).searchParams

      // Get specific item by ID
      const id = searchParams.get('id')
      if (id) {
        let query = supabase.from(table).select(defaultSelect).eq(primaryKey, id)

        // Apply tenant filter
        query = query.eq('tenant_id', profile.tenant_id)

        // Apply soft delete filter
        if (softDelete) {
          query = query.is('deleted_at', null)
        }

        const { data, error } = await query.maybeSingle()

        if (error) {
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }

        if (!data) {
          return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
        }

        return apiSuccess(data)
      }

      // List items with pagination
      const { page, limit, offset } = getPagination(searchParams, maxLimit)

      let query = supabase.from(table).select(defaultSelect, { count: 'exact' })

      // Apply tenant filter
      query = query.eq('tenant_id', profile.tenant_id)

      // Apply soft delete filter
      if (softDelete) {
        query = query.is('deleted_at', null)
      }

      // Apply filter key if provided
      if (filterKey) {
        const filterValue = searchParams.get(filterKey)
        if (filterValue) {
          query = query.eq(filterKey, filterValue)
        }
      }

      // Apply search
      const search = searchParams.get('search')
      if (search && searchFields.length > 0) {
        const searchPattern = `%${search}%`
        const orConditions = searchFields.map((field) => `${field}.ilike.${searchPattern}`)
        query = query.or(orConditions.join(','))
      }

      // Apply status filter if provided
      const status = searchParams.get('status')
      if (status) {
        query = query.eq('status', status)
      }

      // Validate custom query params if schema provided
      if (schemas?.query) {
        const queryParams = Object.fromEntries(searchParams.entries())
        const validation = schemas.query.safeParse(queryParams)
        if (validation.success) {
          // Apply validated filters (implementation specific)
        }
      }

      // Apply custom query modifier
      if (queryModifier) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = queryModifier(query as any, ctx) as any
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false })

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return apiSuccess({
        items: data || [],
        total: count ?? 0,
        page,
        limit,
        hasMore: (count ?? 0) > offset + limit,
      })
    },
    {
      roles: roles?.read,
      rateLimit: rateLimitConfig?.read,
    }
  )

  // ---------------------------------------------------------------------------
  // POST Handler - Create
  // ---------------------------------------------------------------------------
  const POST = withApiAuth(
    async (ctx: ApiHandlerContext) => {
      const { supabase, profile, user, request } = ctx

      // Parse request body
      let body: unknown
      try {
        body = await request.json()
      } catch (_error: unknown) {
        return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
      }

      // Validate with schema if provided
      let data = body as Record<string, unknown>
      if (schemas?.create) {
        const validation = schemas.create.safeParse(body)
        if (!validation.success) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            field_errors: Object.fromEntries(
              Object.entries(validation.error.flatten().fieldErrors).filter(([, v]) => v !== undefined)
            ) as Record<string, string[]>,
          })
        }
        data = validation.data as Record<string, unknown>
      }

      // Apply before create hook
      if (hooks?.beforeCreate) {
        data = (await hooks.beforeCreate(data as z.infer<TCreate>, ctx)) as Record<string, unknown>
      }

      // Insert with tenant_id
      const insertData = {
        ...data,
        tenant_id: profile.tenant_id,
        created_by: user.id,
      }

      const { data: created, error } = await supabase
        .from(table)
        .insert(insertData)
        .select(defaultSelect)
        .single()

      if (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
            details: { message: 'Ya existe un registro con estos datos' },
          })
        }
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Apply after create hook
      let result = created as unknown as Record<string, unknown>
      if (hooks?.afterCreate) {
        result = await hooks.afterCreate(result, ctx)
      }

      return apiSuccess(result, 'Registro creado exitosamente', HTTP_STATUS.CREATED)
    },
    {
      roles: roles?.write,
      rateLimit: rateLimitConfig?.write,
    }
  )

  // ---------------------------------------------------------------------------
  // PUT Handler - Update
  // ---------------------------------------------------------------------------
  const PUT = withApiAuth(
    async (ctx: ApiHandlerContext) => {
      const { supabase, profile, request } = ctx

      // Parse request body
      let body: unknown
      try {
        body = await request.json()
      } catch (_error: unknown) {
        return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
      }

      // Extract ID
      const bodyObj = body as Record<string, unknown>
      const id = bodyObj[primaryKey] as string
      if (!id) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: `${primaryKey} es requerido` },
        })
      }

      // Validate with schema if provided
      let data = bodyObj
      if (schemas?.update) {
        const validation = schemas.update.safeParse(body)
        if (!validation.success) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            field_errors: Object.fromEntries(
              Object.entries(validation.error.flatten().fieldErrors).filter(([, v]) => v !== undefined)
            ) as Record<string, string[]>,
          })
        }
        data = validation.data as Record<string, unknown>
      }

      // Apply before update hook
      if (hooks?.beforeUpdate) {
        data = (await hooks.beforeUpdate(id, data as z.infer<TUpdate>, ctx)) as Record<
          string,
          unknown
        >
      }

      // Remove primary key and tenant_id from update data
      const { [primaryKey]: _id, tenant_id: _tid, ...updateData } = data

      // Update with tenant filter
      const { data: updated, error } = await supabase
        .from(table)
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq(primaryKey, id)
        .eq('tenant_id', profile.tenant_id)
        .select(defaultSelect)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return apiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND)
        }
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Apply after update hook
      let result = updated as unknown as Record<string, unknown>
      if (hooks?.afterUpdate) {
        result = await hooks.afterUpdate(result, ctx)
      }

      return apiSuccess(result, 'Registro actualizado')
    },
    {
      roles: roles?.write,
      rateLimit: rateLimitConfig?.write,
    }
  )

  // ---------------------------------------------------------------------------
  // DELETE Handler
  // ---------------------------------------------------------------------------
  const DELETE = withApiAuth(
    async (ctx: ApiHandlerContext) => {
      const { supabase, profile, user, request } = ctx

      const searchParams = new URL(request.url).searchParams
      const id = searchParams.get('id')

      if (!id) {
        return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
          details: { message: 'ID es requerido' },
        })
      }

      // Apply before delete hook
      if (hooks?.beforeDelete) {
        const canDelete = await hooks.beforeDelete(id, ctx)
        if (!canDelete) {
          return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
            details: { message: 'No se puede eliminar este registro' },
          })
        }
      }

      if (softDelete) {
        // Soft delete
        const { error } = await supabase
          .from(table)
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
          })
          .eq(primaryKey, id)
          .eq('tenant_id', profile.tenant_id)

        if (error) {
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }
      } else {
        // Hard delete
        const { error } = await supabase
          .from(table)
          .delete()
          .eq(primaryKey, id)
          .eq('tenant_id', profile.tenant_id)

        if (error) {
          return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
        }
      }

      // Apply after delete hook
      if (hooks?.afterDelete) {
        await hooks.afterDelete(id, ctx)
      }

      return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT })
    },
    {
      roles: roles?.delete ?? roles?.write,
      rateLimit: rateLimitConfig?.write,
    }
  )

  return { GET, POST, PUT, DELETE }
}

// =============================================================================
// PARAMETER-BASED CRUD HANDLER
// =============================================================================

/**
 * Creates CRUD handlers for routes with URL parameters
 * e.g., /api/pets/[id]/vaccines
 */
export function createCrudHandlerWithParams<
  P extends Record<string, string>,
  TCreate extends z.ZodTypeAny = z.ZodTypeAny,
  TUpdate extends z.ZodTypeAny = z.ZodTypeAny,
>(
  options: CrudHandlerOptions<TCreate, TUpdate> & {
    /** Parent ID parameter name (e.g., 'id' for /api/pets/[id]/vaccines) */
    parentIdParam: keyof P
    /** Foreign key column linking to parent */
    parentForeignKey: string
  }
) {
  const {
    table,
    schemas,
    roles,
    defaultSelect = '*',
    softDelete = true,
    primaryKey = 'id',
    parentIdParam,
    parentForeignKey,
    hooks,
    orderBy = { column: 'created_at', ascending: false },
    maxLimit = 100,
  } = options

  // GET Handler for nested resource
  const GET = withApiAuthParams<P>(
    async ({ params, ...ctx }: ApiHandlerContextWithParams<P>) => {
      const { supabase, profile, request } = ctx
      const parentId = params[parentIdParam as keyof P]
      const searchParams = new URL(request.url).searchParams
      const { page, limit, offset } = getPagination(searchParams, maxLimit)

      let query = supabase
        .from(table)
        .select(defaultSelect, { count: 'exact' })
        .eq('tenant_id', profile.tenant_id)
        .eq(parentForeignKey, parentId)

      if (softDelete) {
        query = query.is('deleted_at', null)
      }

      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false })
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return apiSuccess({
        items: data || [],
        total: count ?? 0,
        page,
        limit,
      })
    },
    { roles: roles?.read }
  )

  // POST Handler for nested resource
  const POST = withApiAuthParams<P>(
    async ({ params, ...ctx }: ApiHandlerContextWithParams<P>) => {
      const { supabase, profile, user, request } = ctx
      const parentId = params[parentIdParam as keyof P]

      let body: unknown
      try {
        body = await request.json()
      } catch (_error: unknown) {
        return apiError('INVALID_FORMAT', HTTP_STATUS.BAD_REQUEST)
      }

      let data = body as Record<string, unknown>
      if (schemas?.create) {
        const validation = schemas.create.safeParse(body)
        if (!validation.success) {
          return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
            field_errors: Object.fromEntries(
              Object.entries(validation.error.flatten().fieldErrors).filter(([, v]) => v !== undefined)
            ) as Record<string, string[]>,
          })
        }
        data = validation.data as Record<string, unknown>
      }

      if (hooks?.beforeCreate) {
        data = (await hooks.beforeCreate(data as z.infer<TCreate>, ctx)) as Record<string, unknown>
      }

      const insertData = {
        ...data,
        tenant_id: profile.tenant_id,
        [parentForeignKey]: parentId,
        created_by: user.id,
      }

      const { data: created, error } = await supabase
        .from(table)
        .insert(insertData)
        .select(defaultSelect)
        .single()

      if (error) {
        if (error.code === '23505') {
          return apiError('CONFLICT', HTTP_STATUS.CONFLICT)
        }
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      return apiSuccess(created, 'Registro creado', HTTP_STATUS.CREATED)
    },
    { roles: roles?.write }
  )

  return { GET, POST }
}

// Note: CrudHandlerOptions is exported at declaration
