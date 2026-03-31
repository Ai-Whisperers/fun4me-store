/**
 * Portal Service Subscriptions Types
 *
 * REF-006: Type definitions extracted from client component
 */

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
  discount_percent: number
  first_month_discount: number
  species_allowed: string[]
  max_pet_weight_kg: number | null
  is_featured: boolean
  service: {
    id: string
    name: string
    category: string
    duration_minutes: number
  }
}

export interface SubscriptionInstance {
  id: string
  scheduled_date: string
  status: string
  pickup_status: string
  delivery_status: string
  customer_rating: number | null
  completed_at: string | null
}

export interface Subscription {
  id: string
  status: string
  started_at: string
  next_service_date: string | null
  next_billing_date: string | null
  current_price: number
  wants_pickup: boolean
  wants_delivery: boolean
  pickup_address: string | null
  delivery_address: string | null
  services_remaining_this_period: number
  preferred_day_of_week: number | null
  preferred_time_slot: string | null
  plan: {
    id: string
    name: string
    service: {
      id: string
      name: string
    }
  }
  pet: {
    id: string
    name: string
    species: string
  }
  instances: SubscriptionInstance[]
}

export interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
  weight_kg: number | null
  photo_url: string | null
}

export interface SubscribeFormData {
  selectedPetId: string
  preferredDay: number
  preferredTime: string
  wantsPickup: boolean
  wantsDelivery: boolean
  pickupAddress: string
  deliveryAddress: string
  specialInstructions: string
}
