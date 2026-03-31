/**
 * Lab Repository
 *
 * Data access layer for lab tests, panels, orders, results, and attachments.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  LabTest,
  TestFilters,
  LabPanel,
  LabOrder,
  LabOrderWithDetails,
  LabOrderItem,
  CreateOrderInput,
  OrderFilters,
  OrderStatus,
  UpdateOrderStatusInput,
  LabResult,
  EnterResultInput,
  LabAttachment,
  CreateAttachmentInput,
  LabComment,
} from './types'

export class LabRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // TEST CATALOG
  // ===========================================================================

  async findManyTests(tenantId: string, filters: TestFilters = {}): Promise<LabTest[]> {
    let query = this.supabase
      .from('lab_test_catalog')
      .select('*')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .order('category')
      .order('display_order')
      .order('name')

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.sample_type) query = query.eq('sample_type', filters.sample_type)
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar pruebas: ${error.message}`)
    return (data || []) as LabTest[]
  }

  async findTestById(id: string): Promise<LabTest | null> {
    const { data, error } = await this.supabase
      .from('lab_test_catalog')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar prueba: ${error.message}`)
    }
    return data as LabTest
  }

  async getTestCategories(tenantId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('lab_test_catalog')
      .select('category')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .eq('is_active', true)

    if (error) throw new Error(`Error al cargar categorías: ${error.message}`)
    const categories = [...new Set(data?.map((t) => t.category) || [])]
    return categories.sort()
  }

  // ===========================================================================
  // PANELS
  // ===========================================================================

  async findManyPanels(tenantId: string): Promise<LabPanel[]> {
    const { data, error } = await this.supabase
      .from('lab_panels')
      .select('*')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('display_order')
      .order('name')

    if (error) throw new Error(`Error al cargar paneles: ${error.message}`)
    return (data || []) as LabPanel[]
  }

  async findPanelById(id: string): Promise<LabPanel | null> {
    const { data, error } = await this.supabase
      .from('lab_panels')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar panel: ${error.message}`)
    }
    return data as LabPanel
  }

  async findTestsByIds(ids: string[]): Promise<LabTest[]> {
    const { data, error } = await this.supabase
      .from('lab_test_catalog')
      .select('*')
      .in('id', ids)
      .is('deleted_at', null)

    if (error) throw new Error(`Error al cargar pruebas: ${error.message}`)
    return (data || []) as LabTest[]
  }

  // ===========================================================================
  // ORDERS
  // ===========================================================================

  async findManyOrders(tenantId: string, filters: OrderFilters = {}): Promise<LabOrderWithDetails[]> {
    let query = this.supabase
      .from('lab_orders')
      .select(`
        *,
        pet:pets(id, name, species),
        orderer:profiles!ordered_by(id, full_name)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.pet_id) query = query.eq('pet_id', filters.pet_id)
    if (filters.ordered_by) query = query.eq('ordered_by', filters.ordered_by)
    if (filters.lab_type) query = query.eq('lab_type', filters.lab_type)
    if (filters.from_date) query = query.gte('created_at', filters.from_date)
    if (filters.to_date) query = query.lte('created_at', filters.to_date)

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar órdenes: ${error.message}`)
    return (data || []) as LabOrderWithDetails[]
  }

  async findPendingOrders(tenantId: string): Promise<LabOrderWithDetails[]> {
    const { data, error } = await this.supabase
      .from('lab_orders')
      .select(`
        *,
        pet:pets(id, name, species),
        orderer:profiles!ordered_by(id, full_name)
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'collected', 'processing'])
      .is('deleted_at', null)
      .order('priority')
      .order('created_at')

    if (error) throw new Error(`Error al cargar órdenes pendientes: ${error.message}`)
    return (data || []) as LabOrderWithDetails[]
  }

  async findOrderById(id: string, tenantId: string): Promise<LabOrderWithDetails | null> {
    const { data, error } = await this.supabase
      .from('lab_orders')
      .select(`
        *,
        pet:pets(id, name, species, breed),
        orderer:profiles!ordered_by(id, full_name),
        collector:profiles!collected_by(id, full_name),
        reviewer:profiles!reviewed_by(id, full_name)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar orden: ${error.message}`)
    }
    return data as LabOrderWithDetails
  }

  async findOrderItems(orderId: string): Promise<LabOrderItem[]> {
    const { data, error } = await this.supabase
      .from('lab_order_items')
      .select(`
        *,
        test:lab_test_catalog(id, code, name, category)
      `)
      .eq('lab_order_id', orderId)

    if (error) throw new Error(`Error al cargar items: ${error.message}`)
    return (data || []) as LabOrderItem[]
  }

  async generateOrderNumber(tenantId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('generate_lab_order_number', {
      p_tenant_id: tenantId,
    })

    if (error) throw new Error(`Error al generar número de orden: ${error.message}`)
    return data as string
  }

  async createOrder(
    tenantId: string,
    orderNumber: string,
    input: CreateOrderInput
  ): Promise<LabOrderWithDetails> {
    const { data, error } = await this.supabase
      .from('lab_orders')
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber,
        pet_id: input.pet_id,
        ordered_by: input.ordered_by,
        medical_record_id: input.medical_record_id,
        priority: input.priority || 'routine',
        clinical_notes: input.clinical_notes,
        fasting_confirmed: input.fasting_confirmed || false,
        lab_type: input.lab_type || 'in_house',
        reference_lab_name: input.reference_lab_name,
        status: 'pending',
      })
      .select(`
        *,
        pet:pets(id, name, species)
      `)
      .single()

    if (error) throw new Error(`Error al crear orden: ${error.message}`)
    return data as LabOrderWithDetails
  }

  async createOrderItems(
    orderId: string,
    tenantId: string,
    items: Array<{ test_id: string; price: number }>
  ): Promise<void> {
    const orderItems = items.map((item) => ({
      lab_order_id: orderId,
      tenant_id: tenantId,
      test_id: item.test_id,
      price: item.price,
      status: 'pending',
    }))

    const { error } = await this.supabase.from('lab_order_items').insert(orderItems)
    if (error) throw new Error(`Error al crear items: ${error.message}`)
  }

  async updateOrderStatus(
    id: string,
    tenantId: string,
    status: OrderStatus,
    metadata?: UpdateOrderStatusInput
  ): Promise<LabOrder> {
    const updates: Record<string, unknown> = { status }
    const now = new Date().toISOString()

    if (status === 'collected') {
      updates.collected_at = now
      if (metadata?.collected_by) updates.collected_by = metadata.collected_by
    } else if (status === 'processing') {
      updates.processing_at = now
    } else if (status === 'completed') {
      updates.completed_at = now
    } else if (status === 'reviewed') {
      updates.reviewed_at = now
      if (metadata?.reviewed_by) updates.reviewed_by = metadata.reviewed_by
    }

    const { data, error } = await this.supabase
      .from('lab_orders')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar estado: ${error.message}`)
    return data as LabOrder
  }

  // ===========================================================================
  // RESULTS
  // ===========================================================================

  async findManyResults(orderId: string, tenantId: string): Promise<LabResult[]> {
    const { data, error } = await this.supabase
      .from('lab_results')
      .select(`
        *,
        test:lab_test_catalog(id, code, name, category, unit)
      `)
      .eq('lab_order_id', orderId)
      .eq('tenant_id', tenantId)
      .order('created_at')

    if (error) throw new Error(`Error al cargar resultados: ${error.message}`)
    return (data || []) as LabResult[]
  }

  async findAbnormalResults(orderId: string, tenantId: string): Promise<LabResult[]> {
    const { data, error } = await this.supabase
      .from('lab_results')
      .select(`
        *,
        test:lab_test_catalog(id, code, name, category)
      `)
      .eq('lab_order_id', orderId)
      .eq('tenant_id', tenantId)
      .eq('is_abnormal', true)

    if (error) throw new Error(`Error al cargar resultados anormales: ${error.message}`)
    return (data || []) as LabResult[]
  }

  async createResult(orderId: string, tenantId: string, input: EnterResultInput): Promise<LabResult> {
    const { data, error } = await this.supabase
      .from('lab_results')
      .insert({
        lab_order_id: orderId,
        tenant_id: tenantId,
        ...input,
      })
      .select(`
        *,
        test:lab_test_catalog(id, code, name, category)
      `)
      .single()

    if (error) throw new Error(`Error al crear resultado: ${error.message}`)
    return data as LabResult
  }

  async updateResult(id: string, tenantId: string, updates: Partial<EnterResultInput>): Promise<LabResult> {
    const { data, error } = await this.supabase
      .from('lab_results')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar resultado: ${error.message}`)
    return data as LabResult
  }

  async updateOrderItemStatus(orderId: string, testId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('lab_order_items')
      .update({ status })
      .eq('lab_order_id', orderId)
      .eq('test_id', testId)

    if (error) throw new Error(`Error al actualizar item: ${error.message}`)
  }

  // ===========================================================================
  // ATTACHMENTS
  // ===========================================================================

  async findManyAttachments(orderId: string, tenantId: string): Promise<LabAttachment[]> {
    const { data, error } = await this.supabase
      .from('lab_result_attachments')
      .select(`
        *,
        uploader:profiles!uploaded_by(id, full_name)
      `)
      .eq('lab_order_id', orderId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Error al cargar archivos adjuntos: ${error.message}`)
    return (data || []) as LabAttachment[]
  }

  async createAttachment(
    orderId: string,
    tenantId: string,
    input: CreateAttachmentInput
  ): Promise<LabAttachment> {
    const { data, error } = await this.supabase
      .from('lab_result_attachments')
      .insert({
        lab_order_id: orderId,
        tenant_id: tenantId,
        ...input,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear archivo adjunto: ${error.message}`)
    return data as LabAttachment
  }

  async deleteAttachment(id: string, tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('lab_result_attachments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(`Error al eliminar archivo adjunto: ${error.message}`)
  }

  // ===========================================================================
  // COMMENTS
  // ===========================================================================

  async findManyComments(orderId: string, tenantId: string): Promise<LabComment[]> {
    const { data, error } = await this.supabase
      .from('lab_result_comments')
      .select(`
        *,
        author:profiles!created_by(id, full_name)
      `)
      .eq('lab_order_id', orderId)
      .eq('tenant_id', tenantId)
      .order('created_at')

    if (error) throw new Error(`Error al cargar comentarios: ${error.message}`)
    return (data || []) as LabComment[]
  }

  async createComment(
    orderId: string,
    tenantId: string,
    comment: string,
    createdBy?: string
  ): Promise<LabComment> {
    const { data, error } = await this.supabase
      .from('lab_result_comments')
      .insert({
        lab_order_id: orderId,
        tenant_id: tenantId,
        comment,
        created_by: createdBy,
      })
      .select(`
        *,
        author:profiles!created_by(id, full_name)
      `)
      .single()

    if (error) throw new Error(`Error al crear comentario: ${error.message}`)
    return data as LabComment
  }
}
