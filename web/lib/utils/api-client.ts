interface ApiResponse<T = unknown> {
  data: T
  message?: string
  status: number
}

class ApiError extends Error {
  status: number
  details?: unknown

  constructor({
    message,
    status,
    details,
  }: {
    message: string
    status: number
    details?: unknown
  }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

type QueryParams = Record<string, string | number | boolean | null | undefined>

class ApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError({
          message: errorData.message || `HTTP ${response.status}`,
          status: response.status,
          details: errorData,
        })
      }

      const data = await response.json()
      return {
        data,
        message: data.message,
        status: response.status,
      }
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error
      }

      // Network or parsing error
      throw new ApiError({
        message: 'Network error or invalid response',
        status: 0,
        details: error,
      })
    }
  }

  async get<T>(endpoint: string, params?: QueryParams): Promise<ApiResponse<T>> {
    const filteredParams = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
        )
      : undefined
    const url = filteredParams
      ? `${endpoint}?${new URLSearchParams(filteredParams as Record<string, string>)}`
      : endpoint
    return this.request<T>(url)
  }

  async post<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

// Create a default instance
export const apiClient = new ApiClient()

// Export the class for custom instances
export { ApiClient, ApiError }
export type { ApiResponse, QueryParams }
