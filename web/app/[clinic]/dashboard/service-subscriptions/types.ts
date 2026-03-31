/**
 * Service Subscriptions Dashboard Types
 *
 * REF-006: Type definitions extracted from client component
 */

export interface Subscription {
  id: string
  status: string
  started_at: string
  next_service_date: string | null
  current_price: number
  wants_pickup: boolean
  wants_delivery: boolean
  pickup_address: string | null
  delivery_address: string | null
  services_remaining_this_period: number
  total_services_used: number
  plan: { id: string; name: string; service: { id: string; name: string } }
  customer: { id: string; full_name: string; email: string; phone: string | null }
  pet: { id: string; name: string; species: string; breed: string | null }
}

export interface Plan {
  id: string
  name: string
  description: string | null
  price_per_period: number
  billing_frequency: string
  service_frequency: string
  services_per_period: number
  includes_pickup: boolean
  includes_delivery: boolean
  pickup_fee: number
  delivery_fee: number
  is_active: boolean
  is_featured: boolean
  service: { id: string; name: string; category: string }
}

export interface UpcomingService {
  instance_id: string
  scheduled_date: string
  pickup_status: string
  delivery_status: string
  customer_name: string
  customer_phone: string | null
  pet_name: string
  pet_species: string
  pickup_address: string | null
  delivery_address: string | null
  plan_name: string
  service_name: string
}

export interface ServiceOption {
  id: string
  name: string
  category: string
}

export interface SubscriptionsPagination {
  total: number
  limit: number
  offset: number
}

export type TabId = 'subscriptions' | 'today' | 'plans'

export interface PlanFormData {
  name: string
  description: string
  service_id: string
  price_per_period: string
  billing_frequency: string
  service_frequency: string
  services_per_period: string
  includes_pickup: boolean
  includes_delivery: boolean
  pickup_fee: string
  delivery_fee: string
  is_featured: boolean
}
