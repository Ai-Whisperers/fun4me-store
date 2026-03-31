/**
 * Domain layer
 * Contains all business domains with their repositories and services
 */

// ===========================================================================
// FACTORY
// ===========================================================================

export { DomainFactory, getDomainFactory } from './factory'

// ===========================================================================
// CORE DOMAINS
// ===========================================================================

export * from './appointments'
export * from './pets'
export * from './invoices'
export * from './payments'
export * from './users'

// ===========================================================================
// CLINICAL DOMAINS
// ===========================================================================

export * from './medical-records'
export * from './hospitalizations'
export * from './lab'
export * from './vaccines'
export * from './clinical-tools'

// ===========================================================================
// OPERATIONAL DOMAINS
// ===========================================================================

export { InventoryRepository, InventoryService, createInventoryService } from './inventory'
export type {
  TransactionType,
  Inventory,
  InventoryTransaction,
  InventoryWithProduct,
  CreateInventoryData,
  UpdateInventoryData,
  StockAdjustmentData,
  InventoryData,
  InventoryFilters,
  TransactionFilters,
  InventoryStats,
  LowStockItem,
  ExpiryItem,
  StockValuation,
  TransactionSummary,
} from './inventory'
export { ConsentRepository, ConsentService, createConsentService } from './consent'
export type {
  ConsentCategory,
  ConsentPreferenceType,
  ConsentSource,
  ConsentDocumentStatus,
  ConsentAuditAction,
  ConsentTemplate,
  ConsentTemplateVersion,
  ConsentDocument,
  ConsentPreference,
  ConsentPreferenceAudit,
  ConsentAuditLog,
  CreateTemplateData,
  UpdateTemplateData,
  CreateDocumentData,
  SignDocumentData,
  RevokeDocumentData,
  UpdatePreferenceData,
  TemplateFilters,
  DocumentFilters,
  ConsentAnalytics,
} from './consent'
export { StoreRepository, StoreService } from './store'
export type {
  OrderStatus,
  CartItemType,
  Product,
  ProductWithStock,
  CartItem,
  Cart,
  Order,
  OrderWithItems,
  CartItemJsonb,
  ProductRow,
  CheckoutInput,
  AddToCartInput,
  UpdateCartItemInput,
  ProductFilters,
  OrderFilters,
  CartSummary,
  OrderStats,
  ProductAnalytics,
} from './store'

// ===========================================================================
// COMMUNICATION DOMAINS
// ===========================================================================

export * from './messaging'
export * from './reminders'

// ===========================================================================
// PUBLIC HEALTH DOMAINS
// ===========================================================================

export * from './safety'
