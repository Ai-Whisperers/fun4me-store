/**
 * API Client - Makes authenticated API calls for seeding
 *
 * Supports both service role (direct DB) and user impersonation modes.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

interface ApiClientConfig {
  baseUrl?: string
  serviceRoleKey?: string
  supabaseUrl?: string
}

interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  status: number
}

class ApiClient {
  private baseUrl: string
  private supabaseUrl: string
  private serviceRoleKey: string
  private currentUser: User | null = null
  private currentAccessToken: string | null = null
  private supabaseClient: SupabaseClient | null = null

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000'
    this.supabaseUrl = config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.serviceRoleKey = config.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  }

  /**
   * Get Supabase admin client (service role)
   */
  getAdminClient(): SupabaseClient {
    if (!this.supabaseClient) {
      if (!this.supabaseUrl || !this.serviceRoleKey) {
        throw new Error('Missing Supabase environment variables')
      }
      this.supabaseClient = createClient(this.supabaseUrl, this.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    return this.supabaseClient
  }

  /**
   * Login as a specific user (for user impersonation mode)
   */
  async loginAs(email: string, password: string): Promise<void> {
    const client = createClient(this.supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(`Login failed for ${email}: ${error.message}`)
    }

    this.currentUser = data.user
    this.currentAccessToken = data.session?.access_token || null
  }

  /**
   * Clear current user session
   */
  logout(): void {
    this.currentUser = null
    this.currentAccessToken = null
  }

  /**
   * Make an authenticated API request
   */
  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.currentAccessToken) {
      headers['Authorization'] = `Bearer ${this.currentAccessToken}`
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : null

      return {
        data,
        error: response.ok ? null : data?.error || data?.message || 'Request failed',
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      }
    }
  }

  // Convenience methods
  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path)
  }

  async post<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body)
  }

  async put<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body)
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path)
  }

  /**
   * Direct database operations (via service role)
   */
  async dbInsert<T extends Record<string, unknown>>(
    table: string,
    data: T | T[]
  ): Promise<{ data: T[] | null; error: string | null }> {
    const client = this.getAdminClient()
    const { data: result, error } = await client.from(table).insert(data).select()

    return {
      data: result as T[] | null,
      error: error?.message || null,
    }
  }

  async dbSelect<T = unknown>(
    table: string,
    query?: {
      select?: string
      eq?: Record<string, unknown>
      limit?: number
    }
  ): Promise<{ data: T[] | null; error: string | null }> {
    const client = this.getAdminClient()
    let q = client.from(table).select(query?.select || '*')

    if (query?.eq) {
      for (const [key, value] of Object.entries(query.eq)) {
        q = q.eq(key, value)
      }
    }

    if (query?.limit) {
      q = q.limit(query.limit)
    }

    const { data, error } = await q

    return {
      data: data as T[] | null,
      error: error?.message || null,
    }
  }

  async dbUpdate<T extends Record<string, unknown>>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<{ data: T | null; error: string | null }> {
    const client = this.getAdminClient()
    const { data: result, error } = await client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    return {
      data: result as T | null,
      error: error?.message || null,
    }
  }

  async dbDelete(table: string, id: string): Promise<{ error: string | null }> {
    const client = this.getAdminClient()
    const { error } = await client.from(table).delete().eq('id', id)
    return { error: error?.message || null }
  }

  async dbUpsert<T extends Record<string, unknown>>(
    table: string,
    data: T | T[],
    onConflict?: string
  ): Promise<{ data: T[] | null; error: string | null }> {
    const client = this.getAdminClient()
    const { data: result, error } = await client.from(table).upsert(data, { onConflict }).select()

    return {
      data: result as T[] | null,
      error: error?.message || null,
    }
  }

  /**
   * Execute raw SQL via RPC function
   * Requires a database function `exec_sql(sql text)` to be defined
   */
  async dbExecute(sql: string): Promise<{ error: string | null }> {
    const client = this.getAdminClient()
    const { error } = await client.rpc('exec_sql', { sql_query: sql })
    return { error: error?.message || null }
  }
}

// Singleton instance
export const apiClient = new ApiClient()

// Export class for custom instances
export { ApiClient }
