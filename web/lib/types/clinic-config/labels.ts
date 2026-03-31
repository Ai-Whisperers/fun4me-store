/**
 * UI Labels Types for Clinic Configuration
 * These types define the localization structure for UI text
 */

// ============================================================================
// Navigation & Layout Labels
// ============================================================================

export interface NavLabels {
  home?: string
  services?: string
  about?: string
  store?: string
  book?: string
  contact?: string
  owners_zone?: string
  login_profile?: string
  dashboard?: string
  profile?: string
  my_pets?: string
  back?: string
  book_btn?: string
  emergency_btn?: string
  faq?: string
  loyalty_program?: string
  menu?: string
  navigation?: string
  tools?: string
  my_account?: string
  login?: string
  settings?: string
}

export interface FooterLabels {
  rights: string
  privacy: string
  terms: string
  contact_us: string
  follow_us: string
  newsletter_title: string
  newsletter_placeholder: string
  newsletter_button: string
}

// ============================================================================
// Page-Specific Labels
// ============================================================================

export interface HomeLabels {
  visit_us: string
  features_title: string
  features_subtitle: string
  features_badge?: string // Override for "Nuestros Servicios" badge
  testimonials_badge?: string // Override for "Testimonios" badge
  tools_badge: string
  contact_badge: string
  map_button: string
  hours_title: string
  emergency_title: string
  emergency_text: string
  emergency_cta: string
  // Optional override labels for non-veterinary tenants
  address_label?: string
  phone_label?: string
  schedule_label?: string
  schedule_text?: string
  whatsapp_label?: string
  whatsapp_text?: string
}

export interface VaccineScheduleData {
  age: string
  n: number
  vaccines: string[]
  note: string
}

export interface VaccineSchedule {
  title: string
  subtitle: string
  dog_label: string
  cat_label: string
  important_label: string
  important_text: string
  data: {
    dog: VaccineScheduleData[]
    cat: VaccineScheduleData[]
  }
}

export interface ServicesLabels {
  meta_title: string
  meta_subtitle: string
  online_badge: string
  emergency_badge: string
  description_label: string
  includes_label: string
  duration_label: string
  table_variant: string
  table_price: string
  book_floating_btn: string
  filter_all: string
  filter_medical: string
  filter_surgery: string
  filter_diagnostics: string
  filter_wellness: string
  filter_grooming: string
  view_details: string
  book_now: string
  contact_for_price: string
  vaccine_schedule: VaccineSchedule
}

export interface AboutLabels {
  team_title: string
  intro_badge: string
  mission_title: string
  vision_title: string
  values_title: string
  certifications_title: string
  facilities_title: string
}

// ============================================================================
// Portal Labels (Pet Owner Dashboard)
// ============================================================================

export interface PortalDashboardStats {
  patients: string
  vaccines: string
  upcoming_appointments: string
  loyalty_points: string
}

export interface PortalDashboard {
  staff_title: string
  owner_title: string
  welcome: string
  quick_actions: string
  recent_activity: string
  stats: PortalDashboardStats
}

export interface PortalEmptyStates {
  no_pets: string
  no_pets_desc: string
  add_pet_btn: string
  no_vaccines: string
  no_appointments: string
  no_records: string
}

export interface PortalPetCard {
  weight: string
  chip: string
  age: string
  breed: string
  vaccines: string
  next_vaccine: string
  add_vaccine: string
  view_history: string
  download_pdf: string
  edit_pet: string
  qr_code: string
}

export interface AppointmentStatusLabels {
  scheduled?: string
  confirmed?: string
  checked_in?: string
  in_progress?: string
  completed?: string
  cancelled?: string
  no_show?: string
  /** @deprecated Use 'scheduled' instead */
  pending?: string
}

export interface PortalAppointmentWidget {
  title: string
  empty: string
  new_appointment: string
  status: AppointmentStatusLabels
}

export interface PortalForms {
  pet_name: string
  pet_species: string
  pet_breed: string
  pet_birthdate: string
  pet_weight: string
  pet_color: string
  pet_gender: string
  pet_neutered: string
  pet_microchip: string
  species_dog: string
  species_cat: string
  species_bird: string
  species_rabbit: string
  species_other: string
  gender_male: string
  gender_female: string
  yes: string
  no: string
}

export interface PortalLabels {
  dashboard: PortalDashboard
  empty_states: PortalEmptyStates
  pet_card: PortalPetCard
  appointment_widget: PortalAppointmentWidget
  forms: PortalForms
}

// ============================================================================
// Store & Commerce Labels
// ============================================================================

export interface ProductCardLabels {
  add: string
  added: string
  out_of_stock: string
  view_details: string
}

export interface StoreCategories {
  all: string
  food: string
  medicine: string
  accessories: string
  hygiene: string
  toys: string
}

export interface StoreLabels {
  title: string
  back_home: string
  hero_title: string
  hero_subtitle: string
  search_placeholder: string
  all_categories: string
  empty_state: string
  no_results: string
  sort_by: string
  sort_popular: string
  sort_price_low: string
  sort_price_high: string
  sort_newest: string
  product_card: ProductCardLabels
  categories: StoreCategories
}

export interface CartLabels {
  title: string
  empty: string
  empty_cta: string
  item_service: string
  item_product: string
  quantity: string
  unit_price: string
  subtotal: string
  clear_btn: string
  total_label: string
  continue_shopping: string
  checkout_btn: string
  delivery_note: string
}

export interface CheckoutLabels {
  title: string
  empty: string
  customer_info: string
  delivery_info: string
  payment_method: string
  order_summary: string
  print_btn: string
  whatsapp_btn: string
  back_cart: string
  order_notes: string
  order_notes_placeholder: string
}

// ============================================================================
// Booking Labels
// ============================================================================

export interface BookingLabels {
  title: string
  select_service: string
  select_date: string
  select_time: string
  select_pet: string
  your_info: string
  confirm_btn: string
  success_title: string
  success_message: string
  available_slots: string
  no_slots: string
}

// ============================================================================
// Common Labels
// ============================================================================

export interface CommonActions {
  save: string
  cancel: string
  edit: string
  delete: string
  confirm: string
  close: string
  back: string
  next: string
  submit: string
  search: string
  filter: string
  clear: string
  download: string
  share: string
  copy: string
}

export interface CommonValidation {
  required: string
  invalid_email: string
  invalid_phone: string
  min_length: string
  max_length: string
}

export interface CommonLabels {
  loading: string
  error: string
  retry: string
  actions: CommonActions
  validation: CommonValidation
}

// ============================================================================
// Auth & Tools Labels
// ============================================================================

export interface AuthLabels {
  login_title: string
  signup_title: string
  email_label: string
  password_label: string
  confirm_password: string
  forgot_password: string
  login_btn: string
  signup_btn: string
  or_divider: string
  google_btn: string
  no_account: string
  has_account: string
  logout: string
}

export interface ToxicFoodLabels {
  title: string
  subtitle: string
  search_placeholder: string
  safe: string
  toxic: string
  caution: string
  disclaimer: string
}

export interface AgeCalculatorLabels {
  title: string
  subtitle: string
  pet_age_label: string
  pet_size_label: string
  size_small: string
  size_medium: string
  size_large: string
  result_prefix: string
  result_suffix: string
}

export interface ToolsLabels {
  toxic_food: ToxicFoodLabels
  age_calculator: AgeCalculatorLabels
}

export interface ErrorLabels {
  '404_title': string
  '404_message': string
  '500_title': string
  '500_message': string
  go_home: string
}
