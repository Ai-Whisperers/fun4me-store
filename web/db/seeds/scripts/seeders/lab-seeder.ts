/**
 * Lab Seeder
 *
 * Seeds laboratory data: lab test catalog, lab orders, results.
 * Handles the critical requirement for NOT NULL order_number.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { BaseSeeder, JsonSeeder, SeederOptions, SeederResult } from './base-seeder'
import { createSeederResult } from '../utils/reporting'
import {
  LabTestCatalogSchema,
  LabTestCatalog,
  LabOrderSchema,
  LabOrder,
  LabOrderItemSchema,
  LabOrderItem,
  LabResultSchema,
  LabResult,
  generateLabOrderNumber,
} from '@/lib/test-utils/schemas'
import { upsertWithIdempotency } from '../utils/idempotency'
import { validateBatch } from '../utils/validation'

/**
 * Lab Test Catalog Seeder
 */
export class LabTestCatalogSeeder extends JsonSeeder<LabTestCatalog> {
  getTableName(): string {
    return 'lab_test_catalog'
  }

  getSchema() {
    return LabTestCatalogSchema
  }

  getJsonPath(): string {
    return 'db/seeds/data/01-reference/lab-tests.json'
  }

  extractData(json: unknown): unknown[] {
    const data = json as { tests?: unknown[]; lab_tests?: unknown[] }
    return data.tests || data.lab_tests || []
  }
}

/**
 * Lab Order Seeder (from JSON)
 */
export class LabOrderSeeder extends JsonSeeder<LabOrder> {
  private orderCounter: number = 0

  getTableName(): string {
    return 'lab_orders'
  }

  getSchema() {
    return LabOrderSchema
  }

  getJsonPath(): string {
    return `db/seeds/data/02-clinic/${this.getTenantId()}/lab-orders.json`
  }

  extractData(json: unknown): unknown[] {
    const data = json as { lab_orders?: unknown[] }
    return (data.lab_orders || []).map((o) => ({
      ...(o as Record<string, unknown>),
      tenant_id: this.getTenantId(),
    }))
  }

  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    // Get current max order number from database
    const { data: existing } = await this.client
      .from('lab_orders')
      .select('order_number')
      .eq('tenant_id', this.getTenantId())
      .order('created_at', { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      const match = existing[0].order_number?.match(/LAB-\d+-(\d+)/)
      if (match) {
        this.orderCounter = parseInt(match[1], 10)
      }
    }

    return data.map((item) => {
      const record = { ...(item as Record<string, unknown>) }

      // Generate order_number if missing
      if (!record.order_number) {
        this.orderCounter++
        record.order_number = generateLabOrderNumber(this.orderCounter)
      }

      return record
    })
  }
}

/**
 * Generate demo lab orders using factory pattern
 */
export class LabOrderDemoSeeder extends BaseSeeder<LabOrder> {
  private petIds: string[] = []
  private vetId: string | null = null
  private testIds: string[] = []
  private count: number = 5

  getTableName(): string {
    return 'lab_orders'
  }

  getSchema() {
    return LabOrderSchema
  }

  /**
   * Set dependencies before seeding
   */
  setDependencies(petIds: string[], vetId: string, testIds: string[], count?: number): void {
    this.petIds = petIds
    this.vetId = vetId
    this.testIds = testIds
    if (count) this.count = count
  }

  async loadData(): Promise<unknown[]> {
    if (this.petIds.length === 0) {
      this.log('No pets available for lab order demo')
      return []
    }

    const orders: unknown[] = []
    const actualCount = Math.min(this.count, this.petIds.length)

    for (let i = 0; i < actualCount; i++) {
      const orderDate = new Date()
      orderDate.setDate(orderDate.getDate() - i * 2) // Stagger orders

      // Vary status based on age
      const statuses = ['pending', 'collected', 'processing', 'completed', 'reviewed']
      const status = statuses[Math.min(i, statuses.length - 1)]

      orders.push({
        tenant_id: this.getTenantId(),
        pet_id: this.petIds[i % this.petIds.length],
        ordered_by: this.vetId,
        priority: ['routine', 'routine', 'urgent', 'stat', 'routine'][i % 5],
        lab_type: i % 2 === 0 ? 'in_house' : 'reference_lab',
        status,
        clinical_notes: [
          'Chequeo de rutina',
          'Seguimiento post-cirugía',
          'Síntomas gastrointestinales',
          'Control de enfermedad crónica',
          'Evaluación pre-quirúrgica',
        ][i % 5],
        fasting_confirmed: i % 2 === 0,
        collected_at: status !== 'pending' ? orderDate.toISOString() : null,
        collected_by: status !== 'pending' ? this.vetId : null,
        processing_at: ['processing', 'completed', 'reviewed'].includes(status)
          ? orderDate.toISOString()
          : null,
        completed_at: ['completed', 'reviewed'].includes(status) ? orderDate.toISOString() : null,
        reviewed_at: status === 'reviewed' ? orderDate.toISOString() : null,
        reviewed_by: status === 'reviewed' ? this.vetId : null,
      })
    }

    return orders
  }

  protected async preProcess(data: unknown[]): Promise<unknown[]> {
    // Get current order counter
    const { data: existing } = await this.client
      .from('lab_orders')
      .select('order_number')
      .eq('tenant_id', this.getTenantId())
      .order('created_at', { ascending: false })
      .limit(1)

    let counter = 0
    if (existing && existing.length > 0) {
      const match = existing[0].order_number?.match(/LAB-\d+-(\d+)/)
      if (match) {
        counter = parseInt(match[1], 10)
      }
    }

    return data.map((item) => {
      const record = { ...(item as Record<string, unknown>) }
      counter++
      record.order_number = generateLabOrderNumber(counter)
      return record
    })
  }

  /**
   * After creating orders, seed order items and results
   */
  protected async postProcess(created: LabOrder[]): Promise<void> {
    for (const order of created) {
      await this.seedOrderItems(order)
    }
  }

  private async seedOrderItems(order: LabOrder): Promise<void> {
    if (this.testIds.length === 0) {
      return
    }

    // Add 2-4 tests per order
    const testCount = Math.floor(Math.random() * 3) + 2
    const selectedTests = this.testIds.slice(0, testCount)
    const items: unknown[] = []

    for (const testId of selectedTests) {
      items.push({
        lab_order_id: order.id,
        test_id: testId,
        status:
          order.status === 'pending'
            ? 'pending'
            : order.status === 'collected'
              ? 'pending'
              : 'completed',
        price: Math.floor(Math.random() * 50000) + 10000, // 10,000 - 60,000 PYG
      })
    }

    const validation = validateBatch(LabOrderItemSchema, items)

    if (validation.totalValid > 0) {
      const { data: createdItems, error } = await this.client
        .from('lab_order_items')
        .insert(validation.valid)
        .select()

      if (error) {
        this.log(`Error creating lab order items: ${error.message}`)
        return
      }

      // If order is completed, add results
      if (['completed', 'reviewed'].includes(order.status) && createdItems) {
        await this.seedResults(order, createdItems)
      }
    }
  }

  private async seedResults(
    order: LabOrder,
    items: Array<{ id: string; test_id: string }>
  ): Promise<void> {
    const results: unknown[] = []

    for (const item of items) {
      // Generate a random result
      const numericValue = Math.round((Math.random() * 100 + 50) * 10) / 10
      const isAbnormal = Math.random() < 0.2 // 20% chance abnormal

      results.push({
        lab_order_id: order.id,
        test_id: item.test_id,
        value: numericValue.toString(),
        numeric_value: numericValue,
        unit: ['mg/dL', 'U/L', 'g/dL', '%', 'mmol/L'][Math.floor(Math.random() * 5)],
        flag: isAbnormal ? (Math.random() < 0.5 ? 'high' : 'low') : 'normal',
        is_abnormal: isAbnormal,
        notes: isAbnormal ? 'Valor fuera del rango normal, se recomienda seguimiento' : null,
      })
    }

    const validation = validateBatch(LabResultSchema, results)

    if (validation.totalValid > 0) {
      await this.client.from('lab_results').insert(validation.valid)
    }
  }
}
