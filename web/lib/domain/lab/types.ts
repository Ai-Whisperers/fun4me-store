/**
 * Lab Domain Types
 *
 * Type definitions for lab test catalog, panels, orders, results, and attachments.
 */

// =============================================================================
// ENUM TYPES
// =============================================================================

export type OrderPriority = 'stat' | 'urgent' | 'routine'
export type OrderStatus = 'pending' | 'collected' | 'processing' | 'completed' | 'reviewed' | 'cancelled'
export type ItemStatus = 'pending' | 'processing' | 'completed' | 'cancelled'
export type LabType = 'in_house' | 'reference_lab'
export type ResultFlag = 'low' | 'normal' | 'high' | 'critical_low' | 'critical_high'

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
  | 'other'

// =============================================================================
// TEST CATALOG TYPES
// =============================================================================

export interface LabTest {
  id: string
  tenant_id?: string | null
  code: string
  name: string
  category: string
  description?: string | null
  base_price: number
  reference_ranges?: Record<string, unknown> | null
  turnaround_days: number
  requires_fasting: boolean
  sample_type?: SampleType | null
  sample_volume_ml?: number | null
  special_instructions?: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface TestFilters {
  category?: string
  sample_type?: SampleType
  is_active?: boolean
  search?: string
}

// =============================================================================
// PANEL TYPES
// =============================================================================

export interface LabPanel {
  id: string
  tenant_id?: string | null
  code: string
  name: string
  description?: string | null
  test_ids: string[]
  panel_price?: number | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  tests?: LabTest[]
}

// =============================================================================
// ORDER TYPES
// =============================================================================

export interface LabOrder {
  id: string
  tenant_id: string
  order_number: string
  pet_id: string
  ordered_by?: string | null
  medical_record_id?: string | null
  priority: OrderPriority
  clinical_notes?: string | null
  fasting_confirmed: boolean
  lab_type: LabType
  reference_lab_name?: string | null
  external_accession?: string | null
  status: OrderStatus
  collected_at?: string | null
  collected_by?: string | null
  processing_at?: string | null
  completed_at?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  created_at: string
  updated_at: string
}

export interface LabOrderWithDetails extends LabOrder {
  pet?: {
    id: string
    name: string
    species: string
    breed?: string | null
  } | null
  orderer?: {
    id: string
    full_name: string
  } | null
  collector?: {
    id: string
    full_name: string
  } | null
  reviewer?: {
    id: string
    full_name: string
  } | null
  items?: LabOrderItem[]
}

export interface LabOrderItem {
  id: string
  lab_order_id: string
  tenant_id: string
  test_id: string
  status: ItemStatus
  price?: number | null
  created_at: string
  updated_at: string
  test?: LabTest
}

export interface CreateOrderInput {
  pet_id: string
  ordered_by?: string
  medical_record_id?: string
  priority?: OrderPriority
  clinical_notes?: string
  fasting_confirmed?: boolean
  lab_type?: LabType
  reference_lab_name?: string
  test_ids: string[]
}

export interface OrderFilters {
  status?: OrderStatus
  priority?: OrderPriority
  pet_id?: string
  ordered_by?: string
  lab_type?: LabType
  from_date?: string
  to_date?: string
  page?: number
  limit?: number
}

export interface UpdateOrderStatusInput {
  collected_by?: string
  reviewed_by?: string
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface LabResult {
  id: string
  lab_order_id: string
  tenant_id: string
  test_id: string
  value: string
  numeric_value?: number | null
  unit?: string | null
  reference_min?: number | null
  reference_max?: number | null
  flag?: ResultFlag | null
  is_abnormal: boolean
  notes?: string | null
  entered_by?: string | null
  created_at: string
  updated_at: string
  test?: LabTest
}

export interface EnterResultInput {
  test_id: string
  value: string
  numeric_value?: number
  unit?: string
  reference_min?: number
  reference_max?: number
  flag?: ResultFlag
  is_abnormal?: boolean
  notes?: string
  entered_by?: string
}

// =============================================================================
// ATTACHMENT & COMMENT TYPES
// =============================================================================

export interface LabAttachment {
  id: string
  lab_order_id: string
  tenant_id: string
  file_url: string
  file_name: string
  file_type?: string | null
  file_size_bytes?: number | null
  description?: string | null
  uploaded_by?: string | null
  created_at: string
}

export interface CreateAttachmentInput {
  file_url: string
  file_name: string
  file_type?: string
  file_size_bytes?: number
  description?: string
  uploaded_by?: string
}

export interface LabComment {
  id: string
  lab_order_id: string
  tenant_id: string
  comment: string
  created_by?: string | null
  created_at: string
  author?: {
    id: string
    full_name: string
  } | null
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface LabStats {
  pending_orders: number
  processing_orders: number
  completed_today: number
  abnormal_results_count: number
  avg_turnaround_hours: number | null
}

// =============================================================================
// LIST RESULTS
// =============================================================================

export interface LabOrderListResult {
  orders: LabOrderWithDetails[]
  count: number
  page: number
  limit: number
}
