/**
 * Integration Tests: Finance - Expenses CRUD
 *
 * Tests expense tracking and financial management.
 * @tags integration, finance, high
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getTestClient, TestContext, waitForDatabase } from '../../__helpers__/db'
import { createProfile, resetSequence } from '../../__helpers__/factories'
import { DEFAULT_TENANT } from '../../__fixtures__/tenants'
import { TENANT_IDS } from '@/lib/constants/tenants'

describe('Finance - Expenses CRUD', () => {
  const ctx = new TestContext()
  let client: ReturnType<typeof getTestClient>
  let adminId: string

  beforeAll(async () => {
    await waitForDatabase()
    client = getTestClient({ serviceRole: true })

    const admin = await createProfile({
      tenantId: DEFAULT_TENANT.id,
      role: 'admin',
      fullName: 'Finance Admin',
    })
    adminId = admin.id
    ctx.track('profiles', adminId)
  })

  afterAll(async () => {
    await ctx.cleanup()
  })

  beforeEach(() => {
    resetSequence()
  })

  describe('CREATE', () => {
    test('creates basic expense', async () => {
      const { data, error } = await client
        .from('expenses')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          description: 'Compra de medicamentos',
          amount: 500000,
          category: 'supplies',
          expense_date: new Date().toISOString().split('T')[0],
          created_by: adminId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.description).toBe('Compra de medicamentos')
      expect(data.amount).toBe(500000)
      expect(data.category).toBe('supplies')

      ctx.track('expenses', data.id)
    })

    test('creates expense with all fields', async () => {
      const { data, error } = await client
        .from('expenses')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          description: 'Pago de alquiler mensual',
          amount: 3000000,
          category: 'rent',
          expense_date: new Date().toISOString().split('T')[0],
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'transfer',
          reference_number: 'TRF-2026-001',
          vendor_name: 'Inmobiliaria Central',
          notes: 'Alquiler febrero 2026',
          status: 'paid',
          created_by: adminId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.category).toBe('rent')
      expect(data.amount).toBe(3000000)
      expect(data.vendor_name).toBe('Inmobiliaria Central')
      expect(data.status).toBe('paid')

      ctx.track('expenses', data.id)
    })

    test('creates expenses for all categories', async () => {
      const categories = ['supplies', 'utilities', 'payroll', 'equipment', 'maintenance']

      for (const category of categories) {
        const { data, error } = await client
          .from('expenses')
          .insert({
            tenant_id: DEFAULT_TENANT.id,
            description: `Gasto de ${category}`,
            amount: 100000,
            category,
            created_by: adminId,
          })
          .select()
          .single()

        expect(error).toBeNull()
        expect(data.category).toBe(category)
        ctx.track('expenses', data.id)
      }
    })

    test('fails with invalid category', async () => {
      const { error } = await client.from('expenses').insert({
        tenant_id: DEFAULT_TENANT.id,
        description: 'Invalid category',
        amount: 10000,
        category: 'invalid_category',
        created_by: adminId,
      })

      expect(error).not.toBeNull()
    })

    test('fails with zero amount', async () => {
      const { error } = await client.from('expenses').insert({
        tenant_id: DEFAULT_TENANT.id,
        description: 'Zero amount',
        amount: 0,
        category: 'supplies',
        created_by: adminId,
      })

      expect(error).not.toBeNull()
    })

    test('fails with negative amount', async () => {
      const { error } = await client.from('expenses').insert({
        tenant_id: DEFAULT_TENANT.id,
        description: 'Negative amount',
        amount: -50000,
        category: 'supplies',
        created_by: adminId,
      })

      expect(error).not.toBeNull()
    })
  })

  describe('READ', () => {
    let readExpenseId: string

    beforeAll(async () => {
      const { data } = await client
        .from('expenses')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          description: 'Read Test Expense',
          amount: 250000,
          category: 'supplies',
          vendor_name: 'Test Vendor',
          created_by: adminId,
        })
        .select()
        .single()
      readExpenseId = data.id
      ctx.track('expenses', readExpenseId)
    })

    test('reads expense by ID', async () => {
      const { data, error } = await client
        .from('expenses')
        .select('*')
        .eq('id', readExpenseId)
        .single()

      expect(error).toBeNull()
      expect(data.description).toBe('Read Test Expense')
    })

    test('reads expenses by tenant', async () => {
      const { data, error } = await client
        .from('expenses')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    test('filters expenses by category', async () => {
      const { data, error } = await client
        .from('expenses')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('category', 'supplies')

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.every((e: { category: string }) => e.category === 'supplies')).toBe(true)
    })

    test('filters expenses by status', async () => {
      const { data, error } = await client
        .from('expenses')
        .select('*')
        .eq('tenant_id', DEFAULT_TENANT.id)
        .eq('status', 'paid')

      expect(error).toBeNull()
    })

    test('calculates total by category', async () => {
      const { data, error } = await client
        .from('expenses')
        .select('category, amount')
        .eq('tenant_id', DEFAULT_TENANT.id)

      expect(error).toBeNull()
      expect(data).not.toBeNull()

      const totals = data!.reduce((acc: Record<string, number>, e: { category: string; amount: number }) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
      }, {})

      expect(typeof totals).toBe('object')
    })
  })

  describe('UPDATE', () => {
    let updateExpenseId: string

    beforeAll(async () => {
      const { data } = await client
        .from('expenses')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          description: 'Update Test Expense',
          amount: 100000,
          category: 'supplies',
          status: 'pending',
          created_by: adminId,
        })
        .select()
        .single()
      updateExpenseId = data.id
      ctx.track('expenses', updateExpenseId)
    })

    test('updates expense amount', async () => {
      const { data, error } = await client
        .from('expenses')
        .update({ amount: 150000 })
        .eq('id', updateExpenseId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.amount).toBe(150000)
    })

    test('approves expense', async () => {
      const { data, error } = await client
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', updateExpenseId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('approved')
      expect(data.approved_by).toBe(adminId)
    })

    test('marks expense as paid', async () => {
      const { data, error } = await client
        .from('expenses')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'cash',
        })
        .eq('id', updateExpenseId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('paid')
    })

    test('adds receipt URL', async () => {
      const { data, error } = await client
        .from('expenses')
        .update({ receipt_url: 'https://storage.example.com/receipt-001.pdf' })
        .eq('id', updateExpenseId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.receipt_url).toContain('receipt-001')
    })
  })

  describe('DELETE', () => {
    test('deletes expense by ID', async () => {
      const { data: created } = await client
        .from('expenses')
        .insert({
          tenant_id: DEFAULT_TENANT.id,
          description: 'To Delete Expense',
          amount: 50000,
          category: 'other',
          created_by: adminId,
        })
        .select()
        .single()

      const { error } = await client.from('expenses').delete().eq('id', created.id)
      expect(error).toBeNull()

      const { data: found } = await client
        .from('expenses')
        .select('*')
        .eq('id', created.id)
        .single()
      expect(found).toBeNull()
    })
  })

  describe('MULTI-TENANT ISOLATION', () => {
    test('expenses are isolated by tenant', async () => {
      const { data: terrapetExpense } = await client
        .from('expenses')
        .insert({
          tenant_id: TENANT_IDS.ADRIS,
          description: 'Adris expense',
          amount: 100000,
          category: 'supplies',
          created_by: adminId,
        })
        .select()
        .single()
      ctx.track('expenses', terrapetExpense.id)

      // Create admin for petlife
      const petlifeAdmin = await createProfile({
        tenantId: 'petlife',
        role: 'admin',
      })
      ctx.track('profiles', petlifeAdmin.id)

      const { data: petlifeExpense } = await client
        .from('expenses')
        .insert({
          tenant_id: TENANT_IDS.PETLIFE,
          description: 'Petlife expense',
          amount: 200000,
          category: 'rent',
          created_by: petlifeAdmin.id,
        })
        .select()
        .single()
      ctx.track('expenses', petlifeExpense.id)

      const { data: terrapetExpenses } = await client
        .from('expenses')
        .select('*')
        .eq('tenant_id', TENANT_IDS.ADRIS)

      const { data: petlifeExpenses } = await client
        .from('expenses')
        .select('*')
        .eq('tenant_id', TENANT_IDS.PETLIFE)

      expect(terrapetExpenses!.some((e: { id: string }) => e.id === terrapetExpense.id)).toBe(true)
      expect(terrapetExpenses!.some((e: { id: string }) => e.id === petlifeExpense.id)).toBe(false)
      expect(petlifeExpenses!.some((e: { id: string }) => e.id === petlifeExpense.id)).toBe(true)
    })
  })
})
