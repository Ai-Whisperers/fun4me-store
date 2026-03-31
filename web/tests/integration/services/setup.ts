/**
 * Integration Test Setup for Service Layer
 * 
 * This module provides utilities for setting up and tearing down
 * integration tests that interact with the real Supabase database.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Test environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    `Missing required environment variables:
    NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? 'SET' : 'NOT SET'}
    SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET'}
    
    Make sure .env.local exists in the web/ directory.`
  );
}

/**
 * Test data tracking for cleanup
 */
export interface TestDataTracker {
  tenantIds: string[];
  userIds: string[];
  petIds: string[];
  invoiceIds: string[];
  paymentIds: string[];
  productIds: string[];
  orderIds: string[];
}

/**
 * Create a Supabase client for integration tests
 */
export function createTestClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Initialize test data tracker
 */
export function createTestDataTracker(): TestDataTracker {
  return {
    tenantIds: [],
    userIds: [],
    petIds: [],
    invoiceIds: [],
    paymentIds: [],
    productIds: [],
    orderIds: [],
  };
}

/**
 * Create a test tenant
 */
export async function createTestTenant(
  supabase: SupabaseClient,
  tracker: TestDataTracker,
  overrides?: Partial<{
    id: string;
    name: string;
    is_active: boolean;
  }>
): Promise<string> {
  const tenantId = overrides?.id || `test-tenant-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const { error } = await supabase.from('tenants').insert({
    id: tenantId,
    name: overrides?.name || 'Test Clinic',
    is_active: overrides?.is_active !== undefined ? overrides.is_active : true,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create test tenant: ${error.message}`);
  }

  tracker.tenantIds.push(tenantId);
  return tenantId;
}

/**
 * Create a test user profile
 */
export async function createTestUser(
  supabase: SupabaseClient,
  tracker: TestDataTracker,
  tenantId: string,
  role: 'owner' | 'vet' | 'admin' = 'owner',
  overrides?: Partial<{
    id: string;
    email: string;
    full_name: string;
    phone: string;
  }>
): Promise<string> {
  const userId = overrides?.id || randomUUID();

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    tenant_id: tenantId,
    role,
    email: overrides?.email || `test-${userId.substring(0, 8)}@example.com`,
    full_name: overrides?.full_name || 'Test User',
    phone: overrides?.phone || '+595981234567',
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  tracker.userIds.push(userId);
  return userId;
}

/**
 * Create a test pet
 */
export async function createTestPet(
  supabase: SupabaseClient,
  tracker: TestDataTracker,
  tenantId: string,
  ownerId: string,
  overrides?: Partial<{
    name: string;
    species: string;
    breed: string;
    weight_kg: number;
  }>
): Promise<string> {
  const { data, error} = await supabase
    .from('pets')
    .insert({
      tenant_id: tenantId,
      owner_id: ownerId,
      name: overrides?.name || 'Test Pet',
      species: overrides?.species || 'dog',
      breed: overrides?.breed || 'Mixed',
      weight_kg: overrides?.weight_kg || 10,
      birth_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago (DATE format)
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test pet: ${error.message}`);
  }

  tracker.petIds.push(data.id);
  return data.id;
}

/**
 * Create a test invoice
 */
export async function createTestInvoice(
  supabase: SupabaseClient,
  tracker: TestDataTracker,
  tenantId: string,
  clientId: string,
  overrides?: Partial<{
    subtotal: number;
    tax_amount: number;
    total: number;
    status: string;
  }>
): Promise<string> {
  const subtotal = overrides?.subtotal || 100;
  const taxAmount = overrides?.tax_amount || 10;
  const total = overrides?.total || 110;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      invoice_number: `INV-TEST-${Date.now()}`,
      subtotal,
      tax_amount: taxAmount,
      total,
      status: overrides?.status || 'draft',
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test invoice: ${error.message}`);
  }

  tracker.invoiceIds.push(data.id);
  return data.id;
}

/**
 * Create a test product
 */
export async function createTestProduct(
  supabase: SupabaseClient,
  tracker: TestDataTracker,
  tenantId: string,
  overrides?: Partial<{
    name: string;
    sku: string;
    base_price: number;
    stock_quantity: number;
    is_prescription_required: boolean;
  }>
): Promise<string> {
  const { data, error } = await supabase
    .from('store_products')
    .insert({
      tenant_id: tenantId,
      name: overrides?.name || 'Test Product',
      sku: overrides?.sku || `TEST-SKU-${Date.now()}`,
      base_price: overrides?.base_price || 50,
      is_active: true,
      is_prescription_required: overrides?.is_prescription_required || false,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test product: ${error.message}`);
  }

  // Create inventory record
  await supabase.from('store_inventory').insert({
    product_id: data.id,
    stock_quantity: overrides?.stock_quantity || 100,
    reorder_point: 10,
    weighted_average_cost: overrides?.base_price || 50,
  });

  tracker.productIds.push(data.id);
  return data.id;
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  tracker: TestDataTracker
): Promise<void> {
  const errors: string[] = [];

  // Order matters - delete children before parents
  
  // Delete orders
  if (tracker.orderIds.length > 0) {
    const { error } = await supabase
      .from('store_orders')
      .delete()
      .in('id', tracker.orderIds);
    if (error) errors.push(`Orders: ${error.message}`);
  }

  // Delete payments
  if (tracker.paymentIds.length > 0) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .in('id', tracker.paymentIds);
    if (error) errors.push(`Payments: ${error.message}`);
  }

  // Delete invoices
  if (tracker.invoiceIds.length > 0) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .in('id', tracker.invoiceIds);
    if (error) errors.push(`Invoices: ${error.message}`);
  }

  // Delete inventory records
  if (tracker.productIds.length > 0) {
    await supabase
      .from('store_inventory')
      .delete()
      .in('product_id', tracker.productIds);
  }

  // Delete products
  if (tracker.productIds.length > 0) {
    const { error } = await supabase
      .from('store_products')
      .delete()
      .in('id', tracker.productIds);
    if (error) errors.push(`Products: ${error.message}`);
  }

  // Delete pets
  if (tracker.petIds.length > 0) {
    const { error } = await supabase
      .from('pets')
      .delete()
      .in('id', tracker.petIds);
    if (error) errors.push(`Pets: ${error.message}`);
  }

  // Delete users
  if (tracker.userIds.length > 0) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .in('id', tracker.userIds);
    if (error) errors.push(`Profiles: ${error.message}`);
  }

  // Delete tenants
  if (tracker.tenantIds.length > 0) {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .in('id', tracker.tenantIds);
    if (error) errors.push(`Tenants: ${error.message}`);
  }

  if (errors.length > 0) {
    console.error('Cleanup errors:', errors);
    throw new Error(`Failed to clean up test data: ${errors.join(', ')}`);
  }
}

/**
 * Wait for a condition to be true (polling)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 100;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(options.errorMessage || 'Condition not met within timeout');
}
