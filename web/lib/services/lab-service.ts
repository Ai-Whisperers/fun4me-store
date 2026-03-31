/**
 * LabService - Laboratory Management Service Layer
 *
 * Handles all laboratory operations:
 * - Test catalog management
 * - Lab panels (test groups)
 * - Lab orders and items
 * - Results entry and management
 * - Attachments and comments
 *
 * @example
 * ```typescript
 * const service = new LabService(supabase);
 * const result = await service.createOrder('tenant-123', orderData);
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Lab order priority
 */
export type OrderPriority = 'stat' | 'urgent' | 'routine';

/**
 * Lab order status
 */
export type OrderStatus = 'pending' | 'collected' | 'processing' | 'completed' | 'reviewed' | 'cancelled';

/**
 * Lab order item status
 */
export type ItemStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

/**
 * Lab type
 */
export type LabType = 'in_house' | 'reference_lab';

/**
 * Sample type
 */
export type SampleType =
  | 'blood'
  | 'serum'
  | 'plasma'
  | 'urine'
  | 'feces'
  | 'tissue'
  | 'swab'
  | 'citrated_blood'
  | 'edta_blood'
  | 'aspirate'
  | 'biopsy'
  | 'skin'
  | 'hair'
  | 'other';

/**
 * Result flag
 */
export type ResultFlag = 'low' | 'normal' | 'high' | 'critical_low' | 'critical_high';

/**
 * Lab test from catalog
 */
export interface LabTest {
  id: string;
  tenant_id?: string | null;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  base_price: number;
  reference_ranges?: Record<string, unknown> | null;
  turnaround_days: number;
  requires_fasting: boolean;
  sample_type?: SampleType | null;
  sample_volume_ml?: number | null;
  special_instructions?: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Lab panel (group of tests)
 */
export interface LabPanel {
  id: string;
  tenant_id?: string | null;
  code: string;
  name: string;
  description?: string | null;
  test_ids: string[];
  panel_price?: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Joined data
  tests?: LabTest[];
}

/**
 * Lab order
 */
export interface LabOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  pet_id: string;
  ordered_by?: string | null;
  medical_record_id?: string | null;
  priority: OrderPriority;
  clinical_notes?: string | null;
  fasting_confirmed: boolean;
  lab_type: LabType;
  reference_lab_name?: string | null;
  external_accession?: string | null;
  status: OrderStatus;
  collected_at?: string | null;
  collected_by?: string | null;
  processing_at?: string | null;
  completed_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  pet?: { id: string; name: string; species: string } | null;
  orderer?: { id: string; full_name: string } | null;
  items?: LabOrderItem[];
}

/**
 * Lab order item
 */
export interface LabOrderItem {
  id: string;
  lab_order_id: string;
  tenant_id: string;
  test_id: string;
  status: ItemStatus;
  price?: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  test?: LabTest;
}

/**
 * Lab result
 */
export interface LabResult {
  id: string;
  lab_order_id: string;
  tenant_id: string;
  test_id: string;
  value: string;
  numeric_value?: number | null;
  unit?: string | null;
  reference_min?: number | null;
  reference_max?: number | null;
  flag?: ResultFlag | null;
  is_abnormal: boolean;
  notes?: string | null;
  entered_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  test?: LabTest;
}

/**
 * Lab result attachment
 */
export interface LabAttachment {
  id: string;
  lab_order_id: string;
  tenant_id: string;
  file_url: string;
  file_name: string;
  file_type?: string | null;
  file_size_bytes?: number | null;
  description?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

/**
 * Lab result comment
 */
export interface LabComment {
  id: string;
  lab_order_id: string;
  tenant_id: string;
  comment: string;
  created_by?: string | null;
  created_at: string;
  // Joined data
  author?: { id: string; full_name: string } | null;
}

/**
 * Input for creating a lab order
 */
export interface CreateOrderData {
  pet_id: string;
  ordered_by?: string;
  medical_record_id?: string;
  priority?: OrderPriority;
  clinical_notes?: string;
  fasting_confirmed?: boolean;
  lab_type?: LabType;
  reference_lab_name?: string;
  test_ids: string[];
}

/**
 * Input for entering a result
 */
export interface EnterResultData {
  test_id: string;
  value: string;
  numeric_value?: number;
  unit?: string;
  reference_min?: number;
  reference_max?: number;
  flag?: ResultFlag;
  is_abnormal?: boolean;
  notes?: string;
  entered_by?: string;
}

/**
 * Filters for listing tests
 */
export interface TestFilters {
  category?: string;
  sample_type?: SampleType;
  is_active?: boolean;
  search?: string;
}

/**
 * Filters for listing orders
 */
export interface OrderFilters {
  status?: OrderStatus;
  priority?: OrderPriority;
  pet_id?: string;
  ordered_by?: string;
  lab_type?: LabType;
  from_date?: string;
  to_date?: string;
}

// =============================================================================
// LAB SERVICE
// =============================================================================

export class LabService extends BaseService {
  // ---------------------------------------------------------------------------
  // TEST CATALOG
  // ---------------------------------------------------------------------------

  /**
   * List available lab tests
   *
   * @param tenantId - Tenant ID (also returns global tests)
   * @param filters - Optional filters
   * @returns List of lab tests
   */
  async listTests(
    tenantId: string,
    filters?: TestFilters
  ): Promise<ServiceResult<LabTest[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('lab_test_catalog')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .is('deleted_at', null)
        .order('category')
        .order('display_order')
        .order('name');

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.sample_type) {
        query = query.eq('sample_type', filters.sample_type);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch lab tests');
  }

  /**
   * Get a specific lab test
   *
   * @param testId - Test ID
   * @returns Lab test record
   */
  async getTest(testId: string): Promise<ServiceResult<LabTest | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_test_catalog')
        .select('*')
        .eq('id', testId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    }, 'Failed to fetch lab test');
  }

  /**
   * Get test categories
   *
   * @param tenantId - Tenant ID
   * @returns List of unique categories
   */
  async getTestCategories(tenantId: string): Promise<ServiceResult<string[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_test_catalog')
        .select('category')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .is('deleted_at', null)
        .eq('is_active', true);

      if (error) throw error;

      const categories = [...new Set(data?.map(t => t.category) || [])];
      return categories.sort();
    }, 'Failed to fetch test categories');
  }

  // ---------------------------------------------------------------------------
  // LAB PANELS
  // ---------------------------------------------------------------------------

  /**
   * List lab panels
   *
   * @param tenantId - Tenant ID
   * @returns List of lab panels
   */
  async listPanels(tenantId: string): Promise<ServiceResult<LabPanel[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_panels')
        .select('*')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('display_order')
        .order('name');

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch lab panels');
  }

  /**
   * Get a panel with its tests
   *
   * @param panelId - Panel ID
   * @param tenantId - Tenant ID
   * @returns Panel with tests
   */
  async getPanel(
    panelId: string,
    tenantId: string
  ): Promise<ServiceResult<LabPanel | null>> {
    return this.handleError(async () => {
      const { data: panel, error } = await this.supabase
        .from('lab_panels')
        .select('*')
        .eq('id', panelId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Fetch tests if panel has test_ids
      if (panel.test_ids && panel.test_ids.length > 0) {
        const { data: tests } = await this.supabase
          .from('lab_test_catalog')
          .select('*')
          .in('id', panel.test_ids)
          .is('deleted_at', null);

        panel.tests = tests || [];
      }

      return panel;
    }, 'Failed to fetch lab panel');
  }

  // ---------------------------------------------------------------------------
  // LAB ORDERS
  // ---------------------------------------------------------------------------

  /**
   * List lab orders
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of lab orders
   */
  async listOrders(
    tenantId: string,
    filters?: OrderFilters
  ): Promise<ServiceResult<LabOrder[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('lab_orders')
        .select(`
          *,
          pet:pets(id, name, species),
          orderer:profiles!ordered_by(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.pet_id) {
        query = query.eq('pet_id', filters.pet_id);
      }

      if (filters?.ordered_by) {
        query = query.eq('ordered_by', filters.ordered_by);
      }

      if (filters?.lab_type) {
        query = query.eq('lab_type', filters.lab_type);
      }

      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch lab orders');
  }

  /**
   * Get pending lab orders
   *
   * @param tenantId - Tenant ID
   * @returns List of pending orders sorted by priority
   */
  async getPendingOrders(tenantId: string): Promise<ServiceResult<LabOrder[]>> {
    return this.handleError(async () => {
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
        .order('created_at');

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch pending orders');
  }

  /**
   * Get a specific lab order with items
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @returns Lab order with items
   */
  async getOrder(
    orderId: string,
    tenantId: string
  ): Promise<ServiceResult<LabOrder | null>> {
    return this.handleError(async () => {
      const { data: order, error } = await this.supabase
        .from('lab_orders')
        .select(`
          *,
          pet:pets(id, name, species, breed),
          orderer:profiles!ordered_by(id, full_name),
          collector:profiles!collected_by(id, full_name),
          reviewer:profiles!reviewed_by(id, full_name)
        `)
        .eq('id', orderId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Fetch order items with test details
      const { data: items } = await this.supabase
        .from('lab_order_items')
        .select(`
          *,
          test:lab_test_catalog(id, code, name, category)
        `)
        .eq('lab_order_id', orderId);

      order.items = items || [];

      return order;
    }, 'Failed to fetch lab order');
  }

  /**
   * Create a new lab order
   *
   * @param tenantId - Tenant ID
   * @param data - Order data
   * @returns Created order
   */
  async createOrder(
    tenantId: string,
    data: CreateOrderData
  ): Promise<ServiceResult<LabOrder>> {
    return this.handleError(async () => {
      // Generate order number
      const { data: orderNumber, error: numError } = await this.supabase.rpc(
        'generate_lab_order_number',
        { p_tenant_id: tenantId }
      );

      if (numError) throw numError;

      // Create the order
      const { data: order, error: orderError } = await this.supabase
        .from('lab_orders')
        .insert({
          tenant_id: tenantId,
          order_number: orderNumber,
          pet_id: data.pet_id,
          ordered_by: data.ordered_by,
          medical_record_id: data.medical_record_id,
          priority: data.priority || 'routine',
          clinical_notes: data.clinical_notes,
          fasting_confirmed: data.fasting_confirmed || false,
          lab_type: data.lab_type || 'in_house',
          reference_lab_name: data.reference_lab_name,
          status: 'pending',
        })
        .select(`
          *,
          pet:pets(id, name, species)
        `)
        .single();

      if (orderError) throw orderError;

      // Create order items for each test
      if (data.test_ids && data.test_ids.length > 0) {
        // Get test prices
        const { data: tests } = await this.supabase
          .from('lab_test_catalog')
          .select('id, base_price')
          .in('id', data.test_ids);

        const testPrices = new Map(tests?.map(t => [t.id, t.base_price]) || []);

        const items = data.test_ids.map(test_id => ({
          lab_order_id: order.id,
          tenant_id: tenantId,
          test_id,
          price: testPrices.get(test_id) || 0,
          status: 'pending',
        }));

        await this.supabase.from('lab_order_items').insert(items);
      }

      return order;
    }, 'Failed to create lab order');
  }

  /**
   * Update order status
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @param status - New status
   * @param metadata - Additional status data
   * @returns Updated order
   */
  async updateOrderStatus(
    orderId: string,
    tenantId: string,
    status: OrderStatus,
    metadata?: {
      collected_by?: string;
      reviewed_by?: string;
    }
  ): Promise<ServiceResult<LabOrder>> {
    return this.handleError(async () => {
      const updates: Record<string, unknown> = { status };

      // Set status-specific timestamps
      const now = new Date().toISOString();
      if (status === 'collected') {
        updates.collected_at = now;
        if (metadata?.collected_by) {
          updates.collected_by = metadata.collected_by;
        }
      } else if (status === 'processing') {
        updates.processing_at = now;
      } else if (status === 'completed') {
        updates.completed_at = now;
      } else if (status === 'reviewed') {
        updates.reviewed_at = now;
        if (metadata?.reviewed_by) {
          updates.reviewed_by = metadata.reviewed_by;
        }
      }

      const { data, error } = await this.supabase
        .from('lab_orders')
        .update(updates)
        .eq('id', orderId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Order not found');
      return data;
    }, 'Failed to update order status');
  }

  /**
   * Cancel a lab order
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @returns Cancelled order
   */
  async cancelOrder(
    orderId: string,
    tenantId: string
  ): Promise<ServiceResult<LabOrder>> {
    return this.updateOrderStatus(orderId, tenantId, 'cancelled');
  }

  // ---------------------------------------------------------------------------
  // LAB RESULTS
  // ---------------------------------------------------------------------------

  /**
   * List results for an order
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @returns List of results
   */
  async listResults(
    orderId: string,
    tenantId: string
  ): Promise<ServiceResult<LabResult[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_results')
        .select(`
          *,
          test:lab_test_catalog(id, code, name, category, unit)
        `)
        .eq('lab_order_id', orderId)
        .eq('tenant_id', tenantId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch lab results');
  }

  /**
   * Enter a lab result
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @param data - Result data
   * @returns Created result
   */
  async enterResult(
    orderId: string,
    tenantId: string,
    data: EnterResultData
  ): Promise<ServiceResult<LabResult>> {
    return this.handleError(async () => {
      // Auto-calculate abnormal flag if reference range provided
      let isAbnormal = data.is_abnormal || false;
      let flag = data.flag;

      if (data.numeric_value !== undefined && data.reference_min !== undefined && data.reference_max !== undefined) {
        if (data.numeric_value < data.reference_min) {
          isAbnormal = true;
          flag = flag || 'low';
        } else if (data.numeric_value > data.reference_max) {
          isAbnormal = true;
          flag = flag || 'high';
        }
      }

      const { data: result, error } = await this.supabase
        .from('lab_results')
        .insert({
          lab_order_id: orderId,
          tenant_id: tenantId,
          test_id: data.test_id,
          value: data.value,
          numeric_value: data.numeric_value,
          unit: data.unit,
          reference_min: data.reference_min,
          reference_max: data.reference_max,
          flag,
          is_abnormal: isAbnormal,
          notes: data.notes,
          entered_by: data.entered_by,
        })
        .select(`
          *,
          test:lab_test_catalog(id, code, name, category)
        `)
        .single();

      if (error) throw error;

      // Update item status to completed
      await this.supabase
        .from('lab_order_items')
        .update({ status: 'completed' })
        .eq('lab_order_id', orderId)
        .eq('test_id', data.test_id);

      return result;
    }, 'Failed to enter result');
  }

  /**
   * Update a lab result
   *
   * @param resultId - Result ID
   * @param tenantId - Tenant ID
   * @param updates - Fields to update
   * @returns Updated result
   */
  async updateResult(
    resultId: string,
    tenantId: string,
    updates: Partial<EnterResultData>
  ): Promise<ServiceResult<LabResult>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_results')
        .update(updates)
        .eq('id', resultId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Result not found');
      return data;
    }, 'Failed to update result');
  }

  /**
   * Get abnormal results for an order
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @returns List of abnormal results
   */
  async getAbnormalResults(
    orderId: string,
    tenantId: string
  ): Promise<ServiceResult<LabResult[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_results')
        .select(`
          *,
          test:lab_test_catalog(id, code, name, category)
        `)
        .eq('lab_order_id', orderId)
        .eq('tenant_id', tenantId)
        .eq('is_abnormal', true);

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch abnormal results');
  }

  // ---------------------------------------------------------------------------
  // ATTACHMENTS
  // ---------------------------------------------------------------------------

  /**
   * List attachments for an order
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @returns List of attachments
   */
  async listAttachments(
    orderId: string,
    tenantId: string
  ): Promise<ServiceResult<LabAttachment[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_result_attachments')
        .select(`
          *,
          uploader:profiles!uploaded_by(id, full_name)
        `)
        .eq('lab_order_id', orderId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch attachments');
  }

  /**
   * Add an attachment to an order
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @param attachment - Attachment data
   * @returns Created attachment
   */
  async addAttachment(
    orderId: string,
    tenantId: string,
    attachment: {
      file_url: string;
      file_name: string;
      file_type?: string;
      file_size_bytes?: number;
      description?: string;
      uploaded_by?: string;
    }
  ): Promise<ServiceResult<LabAttachment>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_result_attachments')
        .insert({
          lab_order_id: orderId,
          tenant_id: tenantId,
          ...attachment,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to add attachment');
  }

  /**
   * Delete an attachment
   *
   * @param attachmentId - Attachment ID
   * @param tenantId - Tenant ID
   * @returns Success status
   */
  async deleteAttachment(
    attachmentId: string,
    tenantId: string
  ): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('lab_result_attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    }, 'Failed to delete attachment');
  }

  // ---------------------------------------------------------------------------
  // COMMENTS
  // ---------------------------------------------------------------------------

  /**
   * List comments for an order
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @returns List of comments
   */
  async listComments(
    orderId: string,
    tenantId: string
  ): Promise<ServiceResult<LabComment[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lab_result_comments')
        .select(`
          *,
          author:profiles!created_by(id, full_name)
        `)
        .eq('lab_order_id', orderId)
        .eq('tenant_id', tenantId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch comments');
  }

  /**
   * Add a comment to an order
   *
   * @param orderId - Order ID
   * @param tenantId - Tenant ID
   * @param comment - Comment text
   * @param createdBy - User ID who created the comment
   * @returns Created comment
   */
  async addComment(
    orderId: string,
    tenantId: string,
    comment: string,
    createdBy?: string
  ): Promise<ServiceResult<LabComment>> {
    return this.handleError(async () => {
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
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to add comment');
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get lab statistics for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Lab stats
   */
  async getStats(tenantId: string): Promise<ServiceResult<{
    pending_orders: number;
    processing_orders: number;
    completed_today: number;
    abnormal_results_count: number;
    avg_turnaround_hours: number | null;
  }>> {
    return this.handleError(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get orders by status
      const { data: orders, error: ordersError } = await this.supabase
        .from('lab_orders')
        .select('status, created_at, completed_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (ordersError) throw ordersError;

      // Get abnormal results count
      const { count: abnormalCount, error: abnormalError } = await this.supabase
        .from('lab_results')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_abnormal', true);

      if (abnormalError) throw abnormalError;

      // Calculate stats
      const pending = orders?.filter(o => o.status === 'pending').length || 0;
      const processing = orders?.filter(o => o.status === 'collected' || o.status === 'processing').length || 0;
      const completedToday = orders?.filter(o =>
        o.status === 'completed' &&
        o.completed_at &&
        new Date(o.completed_at) >= today
      ).length || 0;

      // Calculate average turnaround time
      const completedOrders = orders?.filter(o =>
        o.completed_at && o.created_at
      ) || [];

      let avgTurnaround = null;
      if (completedOrders.length > 0) {
        const totalHours = completedOrders.reduce((sum, o) => {
          const created = new Date(o.created_at).getTime();
          // Non-null assertion safe: completedOrders filtered to only include orders with completed_at (line 1054)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const completed = new Date(o.completed_at!).getTime();
          return sum + (completed - created) / (1000 * 60 * 60);
        }, 0);
        avgTurnaround = Math.round((totalHours / completedOrders.length) * 10) / 10;
      }

      return {
        pending_orders: pending,
        processing_orders: processing,
        completed_today: completedToday,
        abnormal_results_count: abnormalCount || 0,
        avg_turnaround_hours: avgTurnaround,
      };
    }, 'Failed to fetch lab statistics');
  }
}
