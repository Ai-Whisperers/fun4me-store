/**
 * E2E Data Factory
 *
 * Wrapper around the existing factory infrastructure for E2E test context.
 * Provides convenience methods for creating test data with real database operations.
 *
 * Key Features:
 * - Uses service role client to bypass RLS
 * - Tracks created resources for cleanup
 * - Returns IDs for test verification
 *
 * @example
 * ```typescript
 * const factory = new E2EDataFactory()
 * const pet = await factory.createPet(ownerId, { name: 'Test Dog' })
 * // Use pet.id in tests
 * await factory.cleanup() // Called automatically in teardown
 * ```
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

// =============================================================================
// Constants
// =============================================================================

export const E2E_TENANT = 'terrapet'

// =============================================================================
// Factory Class
// =============================================================================

export class E2EDataFactory {
  private supabase: SupabaseClient
  private createdResources: Map<string, string[]> = new Map()

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('[E2EDataFactory] Missing Supabase environment variables')
    }

    this.supabase = createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  /**
   * Track a created resource for cleanup
   */
  private track(table: string, id: string): void {
    const existing = this.createdResources.get(table) || []
    existing.push(id)
    this.createdResources.set(table, existing)
  }

  /**
   * Generate a unique ID with prefix
   */
  private generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).slice(2, 8)
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
  }

  // ===========================================================================
  // Pet Operations
  // ===========================================================================

  /**
   * Create a pet in the database
   */
  async createPet(
    ownerId: string,
    options: {
      name?: string
      species?: 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'
      breed?: string
      birthDate?: string
      weightKg?: number
      sex?: 'male' | 'female'
    } = {}
  ): Promise<{ id: string; name: string; species: string }> {
    const id = crypto.randomUUID()
    const name = options.name || `E2E Pet ${this.generateId()}`

    const { data, error } = await this.supabase
      .from('pets')
      .insert({
        id,
        owner_id: ownerId,
        tenant_id: E2E_TENANT,
        name,
        species: options.species || 'dog',
        breed: options.breed || 'Mixed',
        birth_date: options.birthDate || '2020-01-01',
        weight_kg: options.weightKg || 15,
        sex: options.sex || 'male',
        is_neutered: true,
      })
      .select('id, name, species')
      .single()

    if (error) {
      throw new Error(`[E2EDataFactory] Failed to create pet: ${error.message}`)
    }

    this.track('pets', data.id)
    return data
  }

  /**
   * Create a vaccine record for a pet
   */
  async createVaccine(
    petId: string,
    options: {
      name?: string
      status?: 'completed' | 'scheduled' | 'missed'
      administeredDate?: string
      nextDueDate?: string
    } = {}
  ): Promise<{ id: string; name: string; status: string }> {
    const id = crypto.randomUUID()
    const now = new Date()
    const adminDate = options.administeredDate || now.toISOString().split('T')[0]
    const nextDue = options.nextDueDate || new Date(now.setMonth(now.getMonth() + 12)).toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('vaccines')
      .insert({
        id,
        pet_id: petId,
        administered_by_clinic: E2E_TENANT,
        name: options.name || 'E2E Test Vaccine',
        status: options.status || 'completed',
        administered_date: adminDate,
        next_due_date: nextDue,
        manufacturer: 'E2E Test',
      })
      .select('id, name, status')
      .single()

    if (error) {
      throw new Error(`[E2EDataFactory] Failed to create vaccine: ${error.message}`)
    }

    this.track('vaccines', data.id)
    return data
  }

  // ===========================================================================
  // Store Operations
  // ===========================================================================

  /**
   * Create a store product with inventory
   */
  async createProduct(
    options: {
      name?: string
      sku?: string
      price?: number
      stockQuantity?: number
    } = {}
  ): Promise<{ id: string; name: string; sku: string }> {
    const id = crypto.randomUUID()
    const sku = options.sku || `E2E-${this.generateId()}`
    const name = options.name || `E2E Product ${this.generateId()}`

    const { data: product, error: productError } = await this.supabase
      .from('store_products')
      .insert({
        id,
        tenant_id: E2E_TENANT,
        name,
        sku,
        base_price: options.price || 10000,
        is_active: true,
      })
      .select('id, name, sku')
      .single()

    if (productError) {
      throw new Error(`[E2EDataFactory] Failed to create product: ${productError.message}`)
    }

    this.track('store_products', product.id)

    // Create inventory record
    const inventoryId = crypto.randomUUID()
    const { error: inventoryError } = await this.supabase.from('store_inventory').insert({
      id: inventoryId,
      product_id: product.id,
      tenant_id: E2E_TENANT,
      stock_quantity: options.stockQuantity ?? 100,
      reorder_point: 10,
    })

    if (inventoryError) {
      console.warn(`[E2EDataFactory] Failed to create inventory: ${inventoryError.message}`)
    } else {
      this.track('store_inventory', inventoryId)
    }

    return product
  }

  /**
   * Add item to cart for a user
   */
  async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1
  ): Promise<{ cartId: string }> {
    // Get or create cart
    let { data: cart } = await this.supabase
      .from('store_carts')
      .select('id')
      .eq('customer_id', userId)
      .eq('tenant_id', E2E_TENANT)
      .single()

    if (!cart) {
      const cartId = crypto.randomUUID()
      const { data: newCart, error } = await this.supabase
        .from('store_carts')
        .insert({
          id: cartId,
          customer_id: userId,
          tenant_id: E2E_TENANT,
          items: [],
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`[E2EDataFactory] Failed to create cart: ${error.message}`)
      }

      cart = newCart
      this.track('store_carts', cart.id)
    }

    // Add item to cart (update items JSONB array)
    const { data: currentCart } = await this.supabase
      .from('store_carts')
      .select('items')
      .eq('id', cart.id)
      .single()

    const items = currentCart?.items || []
    const existingItem = items.find((i: { product_id: string }) => i.product_id === productId)

    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      items.push({ product_id: productId, quantity })
    }

    await this.supabase.from('store_carts').update({ items }).eq('id', cart.id)

    return { cartId: cart.id }
  }

  // ===========================================================================
  // Appointment Operations
  // ===========================================================================

  /**
   * Create an appointment
   */
  async createAppointment(
    petId: string,
    serviceId: string,
    options: {
      startTime?: string
      vetId?: string
      status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
    } = {}
  ): Promise<{ id: string; start_time: string; status: string }> {
    const id = crypto.randomUUID()
    const now = new Date()
    now.setDate(now.getDate() + 7) // Default to 1 week from now
    now.setHours(10, 0, 0, 0)

    const startTime = options.startTime || now.toISOString()
    const endTime = new Date(new Date(startTime).getTime() + 30 * 60 * 1000).toISOString()

    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
        id,
        tenant_id: E2E_TENANT,
        pet_id: petId,
        service_id: serviceId,
        vet_id: options.vetId,
        start_time: startTime,
        end_time: endTime,
        status: options.status || 'scheduled',
      })
      .select('id, start_time, status')
      .single()

    if (error) {
      throw new Error(`[E2EDataFactory] Failed to create appointment: ${error.message}`)
    }

    this.track('appointments', data.id)
    return data
  }

  // ===========================================================================
  // Messaging Operations
  // ===========================================================================

  /**
   * Create a conversation with a message
   */
  async createConversation(
    clientId: string,
    options: {
      subject?: string
      initialMessage?: string
      petId?: string
    } = {}
  ): Promise<{ conversationId: string; messageId: string }> {
    const conversationId = crypto.randomUUID()

    const { error: convError } = await this.supabase.from('conversations').insert({
      id: conversationId,
      tenant_id: E2E_TENANT,
      client_id: clientId,
      pet_id: options.petId,
      channel: 'web',
      status: 'open',
      subject: options.subject || 'E2E Test Conversation',
    })

    if (convError) {
      throw new Error(`[E2EDataFactory] Failed to create conversation: ${convError.message}`)
    }

    this.track('conversations', conversationId)

    // Create initial message
    const messageId = crypto.randomUUID()
    const { error: msgError } = await this.supabase.from('messages').insert({
      id: messageId,
      conversation_id: conversationId,
      sender_id: clientId,
      sender_type: 'client',
      content: options.initialMessage || 'E2E Test Message',
      status: 'sent',
    })

    if (msgError) {
      console.warn(`[E2EDataFactory] Failed to create message: ${msgError.message}`)
    } else {
      this.track('messages', messageId)
    }

    return { conversationId, messageId }
  }

  // ===========================================================================
  // Loyalty Operations
  // ===========================================================================

  /**
   * Add loyalty points to a user
   */
  async addLoyaltyPoints(
    userId: string,
    points: number,
    description: string = 'E2E Test Points'
  ): Promise<{ balance: number }> {
    // Get current balance
    const { data: existing } = await this.supabase
      .from('loyalty_points')
      .select('id, balance')
      .eq('user_id', userId)
      .single()

    if (existing) {
      // Update existing
      const newBalance = existing.balance + points
      await this.supabase
        .from('loyalty_points')
        .update({ balance: newBalance, lifetime_earned: newBalance })
        .eq('id', existing.id)

      return { balance: newBalance }
    } else {
      // Create new
      const id = crypto.randomUUID()
      await this.supabase.from('loyalty_points').insert({
        id,
        user_id: userId,
        tenant_id: E2E_TENANT,
        balance: points,
        lifetime_earned: points,
      })

      this.track('loyalty_points', id)
      return { balance: points }
    }
  }

  // ===========================================================================
  // Invoice Operations
  // ===========================================================================

  /**
   * Create an invoice
   */
  async createInvoice(
    clientId: string,
    options: {
      total?: number
      status?: 'draft' | 'sent' | 'paid' | 'overdue'
    } = {}
  ): Promise<{ id: string; invoice_number: string; status: string }> {
    const id = crypto.randomUUID()
    const invoiceNumber = `E2E-${Date.now()}`

    const { data, error } = await this.supabase
      .from('invoices')
      .insert({
        id,
        tenant_id: E2E_TENANT,
        client_id: clientId,
        invoice_number: invoiceNumber,
        subtotal: options.total || 100000,
        tax_amount: (options.total || 100000) * 0.1,
        total: (options.total || 100000) * 1.1,
        status: options.status || 'sent',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select('id, invoice_number, status')
      .single()

    if (error) {
      throw new Error(`[E2EDataFactory] Failed to create invoice: ${error.message}`)
    }

    this.track('invoices', data.id)
    return data
  }

  // ===========================================================================
  // Notification Operations
  // ===========================================================================

  /**
   * Create a notification for a user
   */
  async createNotification(
    userId: string,
    options: {
      title?: string
      message?: string
      type?: string
    } = {}
  ): Promise<{ id: string }> {
    const id = crypto.randomUUID()

    const { error } = await this.supabase.from('notifications').insert({
      id,
      user_id: userId,
      title: options.title || 'E2E Test Notification',
      message: options.message || 'This is a test notification',
      type: options.type || 'info',
    })

    if (error) {
      throw new Error(`[E2EDataFactory] Failed to create notification: ${error.message}`)
    }

    this.track('notifications', id)
    return { id }
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  /**
   * Get test data directly from database
   */
  async getPet(petId: string): Promise<Record<string, unknown> | null> {
    const { data } = await this.supabase.from('pets').select('*').eq('id', petId).single()
    return data
  }

  async getVaccines(petId: string): Promise<Array<Record<string, unknown>>> {
    const { data } = await this.supabase.from('vaccines').select('*').eq('pet_id', petId)
    return data || []
  }

  async getAppointments(petId: string): Promise<Array<Record<string, unknown>>> {
    const { data } = await this.supabase.from('appointments').select('*').eq('pet_id', petId)
    return data || []
  }

  async getCart(userId: string): Promise<Record<string, unknown> | null> {
    const { data } = await this.supabase
      .from('store_carts')
      .select('*')
      .eq('customer_id', userId)
      .single()
    return data
  }

  async getLoyaltyBalance(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('loyalty_points')
      .select('balance')
      .eq('user_id', userId)
      .single()
    return data?.balance || 0
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up all resources created by this factory instance
   */
  async cleanup(): Promise<void> {
    console.log('[E2EDataFactory] Cleaning up created resources...')

    // Cleanup order (children before parents)
    const cleanupOrder = [
      'messages',
      'conversations',
      'notifications',
      'invoice_items',
      'payments',
      'invoices',
      'appointments',
      'vaccines',
      'pets',
      'loyalty_transactions',
      'loyalty_points',
      'store_cart_items',
      'store_carts',
      'store_inventory',
      'store_products',
    ]

    for (const table of cleanupOrder) {
      const ids = this.createdResources.get(table) || []
      if (ids.length > 0) {
        const { error } = await this.supabase.from(table).delete().in('id', ids)
        if (error) {
          console.warn(`[E2EDataFactory] Failed to cleanup ${table}: ${error.message}`)
        } else {
          console.log(`[E2EDataFactory] Cleaned up ${ids.length} ${table}`)
        }
      }
    }

    this.createdResources.clear()
  }

  /**
   * Get the Supabase client for direct operations
   */
  getClient(): SupabaseClient {
    return this.supabase
  }
}

// Export singleton instance
export const e2eFactory = new E2EDataFactory()
