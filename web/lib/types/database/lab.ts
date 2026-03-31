/**
 * Laboratory Database Tables
 * LabTestCatalog, LabOrder, LabResult
 */

import type { LabCategory, LabOrderStatus, LabResultFlag } from './enums'

// =============================================================================
// LAB RESULTS
// =============================================================================

export interface LabTestCatalog {
  id: string
  tenant_id: string | null
  code: string
  name: string
  category: LabCategory
  description: string | null
  specimen_type: string | null
  specimen_requirements: string | null
  turnaround_hours: number | null
  is_in_house: boolean
  base_price: number | null
  external_lab_cost: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LabOrder {
  id: string
  tenant_id: string
  pet_id: string
  order_number: string
  ordered_at: string
  ordered_by: string | null
  medical_record_id: string | null
  hospitalization_id: string | null
  clinical_notes: string | null
  fasting_status: 'fasted' | 'non_fasted' | 'unknown' | null
  specimen_collected_at: string | null
  specimen_collected_by: string | null
  specimen_type: string | null
  specimen_quality:
    | 'adequate'
    | 'hemolyzed'
    | 'lipemic'
    | 'icteric'
    | 'clotted'
    | 'insufficient'
    | null
  lab_type: 'in_house' | 'external'
  external_lab_name: string | null
  external_lab_accession: string | null
  sent_to_lab_at: string | null
  status: LabOrderStatus
  priority: 'stat' | 'urgent' | 'routine'
  results_received_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  has_critical_values: boolean
  critical_values_acknowledged: boolean
  invoice_id: string | null
  total_cost: number | null
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface LabResult {
  id: string
  lab_order_id: string
  lab_order_item_id: string | null
  test_id: string | null
  component_name: string
  result_type:
    | 'numeric'
    | 'text'
    | 'positive_negative'
    | 'reactive_nonreactive'
    | 'detected_not_detected'
    | 'qualitative'
  numeric_value: number | null
  text_value: string | null
  unit: string | null
  reference_range_id: string | null
  range_low: number | null
  range_high: number | null
  flag: LabResultFlag | null
  is_critical: boolean
  method: string | null
  instrument: string | null
  entered_by: string | null
  entered_at: string
  verified_by: string | null
  verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
