// =============================================================================
// STORE TYPES - Complete type definitions for veterinary e-commerce
// =============================================================================

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const SPECIES = [
  'perro',
  'gato',
  'ave',
  'reptil',
  'pez',
  'roedor',
  'conejo',
  'otro',
] as const
export type Species = (typeof SPECIES)[number]

export const LIFE_STAGES = ['cachorro', 'junior', 'adulto', 'senior'] as const
export type LifeStage = (typeof LIFE_STAGES)[number]

export const BREED_SIZES = ['mini', 'pequeno', 'mediano', 'grande', 'gigante'] as const
export type BreedSize = (typeof BREED_SIZES)[number]

export const HEALTH_CONDITIONS = [
  'urinario',
  'digestivo',
  'piel',
  'articulaciones',
  'peso',
  'renal',
  'cardiaco',
  'hepatico',
  'diabetico',
  'alergias',
] as const
export type HealthCondition = (typeof HEALTH_CONDITIONS)[number]

export const VARIANT_TYPES = ['size', 'flavor', 'color', 'weight'] as const
export type VariantType = (typeof VARIANT_TYPES)[number]

export const DISCOUNT_TYPES = ['percentage', 'fixed_amount', 'free_shipping'] as const
export type DiscountType = (typeof DISCOUNT_TYPES)[number]

export const RELATION_TYPES = [
  'similar',
  'complementary',
  'upgrade',
  'accessory',
  'frequently_bought',
] as const
export type RelationType = (typeof RELATION_TYPES)[number]

export const PRESCRIPTION_STATUSES = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'expired',
] as const
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number]

export const SORT_OPTIONS = [
  'relevance',
  'price_low_high',
  'price_high_low',
  'newest',
  'rating',
  'best_selling',
  'name_asc',
  'discount',
] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

// =============================================================================
// BRAND
// =============================================================================

export interface StoreBrand {
  id: string
  tenant_id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  website_url: string | null
  is_featured: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// CATEGORY & SUBCATEGORY
// =============================================================================

export interface StoreCategory {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  image_url: string | null
  sort_order: number
  is_featured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  subcategories?: StoreSubcategory[]
  product_count?: number
}

export interface StoreSubcategory {
  id: string
  tenant_id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  product_count?: number
}

// =============================================================================
// PRODUCT
// =============================================================================

export interface StoreProduct {
  id: string
  tenant_id: string
  category_id: string | null
  subcategory_id: string | null
  brand_id: string | null
  sku: string | null
  barcode: string | null
  name: string
  short_description: string | null
  description: string | null
  image_url: string | null
  base_price: number
  specifications: Record<string, string>
  features: string[]
  ingredients: string | null
  nutritional_info: Record<string, string | number>
  species: Species[]
  life_stages: LifeStage[]
  breed_sizes: BreedSize[]
  health_conditions: HealthCondition[]
  weight_grams: number | null
  dimensions: { length?: number; width?: number; height?: number } | null
  is_prescription_required: boolean
  is_featured: boolean
  is_new_arrival: boolean
  is_best_seller: boolean
  avg_rating: number
  review_count: number
  sales_count: number
  view_count: number
  meta_title: string | null
  meta_description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreProductWithDetails extends StoreProduct {
  category: StoreCategory | null
  subcategory: StoreSubcategory | null
  brand: StoreBrand | null
  inventory: {
    stock_quantity: number
    min_stock_level: number | null
  } | null
  images: StoreProductImage[]
  variants: StoreProductVariant[]
  current_price: number
  original_price: number | null
  has_discount: boolean
  discount_percentage: number | null
}

// =============================================================================
// PRODUCT IMAGE
// =============================================================================

export interface StoreProductImage {
  id: string
  product_id: string
  tenant_id: string
  image_url: string
  alt_text: string | null
  sort_order: number
  is_primary: boolean
  created_at: string
}

// =============================================================================
// PRODUCT VARIANT
// =============================================================================

export interface StoreProductVariant {
  id: string
  product_id: string
  tenant_id: string
  sku: string
  name: string
  variant_type: VariantType
  price_modifier: number
  stock_quantity: number
  sort_order: number
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// REVIEW
// =============================================================================

export interface StoreReview {
  id: string
  product_id: string
  tenant_id: string
  user_id: string
  rating: number
  title: string | null
  content: string | null
  is_verified_purchase: boolean
  order_id: string | null
  helpful_count: number
  reported_count: number
  is_approved: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  // Joined data
  user?: {
    full_name: string | null
    avatar_url: string | null
  }
  images?: StoreReviewImage[]
}

export interface StoreReviewImage {
  id: string
  review_id: string
  tenant_id: string
  image_url: string
  sort_order: number
  created_at: string
}

export interface StoreReviewVote {
  id: string
  review_id: string
  user_id: string
  is_helpful: boolean
  created_at: string
}

export interface ReviewSummary {
  avg_rating: number
  total_reviews: number
  rating_distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

// =============================================================================
// WISHLIST
// =============================================================================

export interface StoreWishlistItem {
  id: string
  user_id: string
  product_id: string
  tenant_id: string
  variant_id: string | null
  notes: string | null
  notify_on_sale: boolean
  notify_on_stock: boolean
  created_at: string
  // Joined data
  product?: StoreProductWithDetails
}

// =============================================================================
// STOCK ALERT
// =============================================================================

export interface StoreStockAlert {
  id: string
  product_id: string
  tenant_id: string
  user_id: string | null
  email: string
  variant_id: string | null
  notified: boolean
  notified_at: string | null
  created_at: string
}

// =============================================================================
// COUPON
// =============================================================================

export interface StoreCoupon {
  id: string
  tenant_id: string
  code: string
  name: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  minimum_purchase: number
  maximum_discount: number | null
  max_uses: number | null
  max_uses_per_user: number
  used_count: number
  valid_from: string
  valid_until: string
  applies_to_sale_items: boolean
  first_purchase_only: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreCouponUsage {
  id: string
  coupon_id: string
  user_id: string
  tenant_id: string
  order_id: string | null
  discount_applied: number
  used_at: string
}

export interface CouponValidationResult {
  valid: boolean
  error?: string
  coupon_id?: string
  discount_type?: DiscountType
  discount_value?: number
  calculated_discount?: number
  name?: string
}

// =============================================================================
// PRODUCT QUESTION
// =============================================================================

export interface StoreProductQuestion {
  id: string
  product_id: string
  tenant_id: string
  user_id: string
  question: string
  answer: string | null
  answered_by: string | null
  answered_at: string | null
  is_public: boolean
  created_at: string
  // Joined data
  user?: {
    full_name: string | null
  }
  answerer?: {
    full_name: string | null
  }
}

// =============================================================================
// RECENTLY VIEWED
// =============================================================================

export interface StoreRecentlyViewed {
  id: string
  user_id: string
  product_id: string
  tenant_id: string
  viewed_at: string
  view_count: number
  // Joined data
  product?: StoreProductWithDetails
}

// =============================================================================
// RELATED PRODUCTS
// =============================================================================

export interface StoreRelatedProduct {
  id: string
  product_id: string
  related_product_id: string
  tenant_id: string
  relation_type: RelationType
  sort_order: number
  created_at: string
  // Joined data
  related_product?: StoreProductWithDetails
}

// =============================================================================
// PRESCRIPTION
// =============================================================================

export interface StorePrescription {
  id: string
  tenant_id: string
  user_id: string
  pet_id: string | null
  prescription_url: string | null
  prescription_number: string | null
  vet_name: string | null
  vet_license: string | null
  vet_id: string | null
  issued_date: string
  expiry_date: string | null
  status: PrescriptionStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined data
  pet?: {
    id: string
    name: string
    species: string
  }
  products?: StorePrescriptionProduct[]
}

export interface StorePrescriptionProduct {
  id: string
  prescription_id: string
  product_id: string
  quantity_authorized: number
  quantity_purchased: number
  created_at: string
  // Joined data
  product?: StoreProduct
}

// =============================================================================
// CAMPAIGN
// =============================================================================

export interface StoreCampaign {
  id: string
  tenant_id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
  items?: StoreCampaignItem[]
}

export interface StoreCampaignItem {
  id: string
  campaign_id: string
  product_id: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface ProductFilters {
  search?: string
  category?: string
  subcategory?: string
  brand?: string
  species?: Species[]
  life_stages?: LifeStage[]
  breed_sizes?: BreedSize[]
  health_conditions?: HealthCondition[]
  price_min?: number
  price_max?: number
  in_stock_only?: boolean
  on_sale?: boolean
  new_arrivals?: boolean
  best_sellers?: boolean
  featured?: boolean
  prescription_required?: boolean
  min_rating?: number
}

export interface ProductQueryParams extends ProductFilters {
  page?: number
  limit?: number
  sort?: SortOption
}

// Lightweight product type for list views (not full StoreProductWithDetails)
export interface ProductListItem {
  id: string
  sku: string | null
  name: string
  description: string | null
  short_description: string | null
  base_price: number
  sale_price: number | null
  current_price: number
  image_url: string | null
  target_species: string[] | null
  is_prescription_required: boolean
  stock_quantity: number
  is_active: boolean
  brand: { id: string; name: string; slug: string } | null
  category: { id: string; name: string; slug: string } | null
  // Optional display-only fields (may not always be populated)
  original_price?: number | null
  has_discount?: boolean
  discount_percentage?: number | null
  is_new_arrival?: boolean
  is_best_seller?: boolean
  avg_rating?: number
  review_count?: number
  inventory?: { stock_quantity: number; min_stock_level?: number | null } | null
  // Product images (may be empty for list views)
  images?: StoreProductImage[]
}

export interface ProductListResponse {
  products: ProductListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters: {
    applied: ProductFilters
    available: AvailableFilters
  }
}

export interface AvailableFilters {
  categories: { id: string; name: string; slug: string; parent_slug?: string; count: number }[]
  subcategories: { id: string; name: string; slug: string; count: number }[]
  brands: { id: string; name: string; slug: string; count: number }[]
  species: { value: Species; label: string; count: number }[]
  life_stages: { value: LifeStage; label: string; count: number }[]
  breed_sizes: { value: BreedSize; label: string; count: number }[]
  health_conditions: { value: HealthCondition; label: string; count: number }[]
  price_range: { min: number; max: number }
}

export interface ReviewQueryParams {
  product_id: string
  page?: number
  limit?: number
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'
  rating?: number
  verified_only?: boolean
  with_images?: boolean
}

export interface ReviewListResponse {
  reviews: StoreReview[]
  summary: ReviewSummary
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface CreateReviewInput {
  product_id: string
  rating: number
  title?: string
  content?: string
  images?: string[]
}

export interface WishlistResponse {
  items: StoreWishlistItem[]
  total: number
}

export interface CreateStockAlertInput {
  product_id: string
  email: string
  variant_id?: string
}

export interface ApplyCouponInput {
  code: string
  cart_total: number
}

export interface AskQuestionInput {
  product_id: string
  question: string
}

// =============================================================================
// CART TYPES (Enhanced)
// =============================================================================

export type CartItemType = 'service' | 'product'

export interface CartItem {
  id: string
  name: string
  price: number
  type: CartItemType
  quantity: number
  image_url?: string
  description?: string
  stock?: number
  variant_id?: string
  variant_name?: string
  sku?: string
}

export interface CartState {
  items: CartItem[]
  coupon: CouponValidationResult | null
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

export interface SearchSuggestion {
  type: 'product' | 'category' | 'brand' | 'query'
  id?: string
  name: string
  slug?: string
  image_url?: string
  price?: number
  category?: string
}

export interface SearchResponse {
  suggestions: SearchSuggestion[]
  products: StoreProductWithDetails[]
  total: number
}

// =============================================================================
// UI LABELS (Spanish)
// =============================================================================

export const SPECIES_LABELS: Record<Species, string> = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  reptil: 'Reptil',
  pez: 'Pez',
  roedor: 'Roedor',
  conejo: 'Conejo',
  otro: 'Otro',
}

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  cachorro: 'Cachorro',
  junior: 'Junior',
  adulto: 'Adulto',
  senior: 'Senior',
}

export const BREED_SIZE_LABELS: Record<BreedSize, string> = {
  mini: 'Mini (< 4kg)',
  pequeno: 'Pequeño (4-10kg)',
  mediano: 'Mediano (10-25kg)',
  grande: 'Grande (25-45kg)',
  gigante: 'Gigante (> 45kg)',
}

export const HEALTH_CONDITION_LABELS: Record<HealthCondition, string> = {
  urinario: 'Salud Urinaria',
  digestivo: 'Salud Digestiva',
  piel: 'Piel y Pelaje',
  articulaciones: 'Articulaciones',
  peso: 'Control de Peso',
  renal: 'Salud Renal',
  cardiaco: 'Salud Cardíaca',
  hepatico: 'Salud Hepática',
  diabetico: 'Diabetes',
  alergias: 'Alergias',
}

export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  relevance: 'Relevancia',
  price_low_high: 'Precio: menor a mayor',
  price_high_low: 'Precio: mayor a menor',
  newest: 'Más recientes',
  rating: 'Mejor calificados',
  best_selling: 'Más vendidos',
  name_asc: 'Nombre: A-Z',
  discount: 'Mayor descuento',
}

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  pending: 'Pendiente',
  under_review: 'En Revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Expirada',
}
