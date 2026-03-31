/**
 * Combined UI Labels Type
 * Aggregates all label types into a single interface
 */

import type {
  NavLabels,
  FooterLabels,
  HomeLabels,
  ServicesLabels,
  AboutLabels,
  PortalLabels,
  StoreLabels,
  CartLabels,
  CheckoutLabels,
  BookingLabels,
  CommonLabels,
  AuthLabels,
  ToolsLabels,
  ErrorLabels,
} from './labels'

import type { DashboardLabels } from './dashboard-labels'

export interface UiLabels {
  nav: NavLabels
  footer: FooterLabels
  home: HomeLabels
  services: ServicesLabels
  about: AboutLabels
  portal: PortalLabels
  store: StoreLabels
  cart: CartLabels
  checkout: CheckoutLabels
  booking: BookingLabels
  common: CommonLabels
  auth: AuthLabels
  tools: ToolsLabels
  errors: ErrorLabels
  dashboard?: DashboardLabels
}

// Re-export for convenience
export type {
  NavLabels,
  FooterLabels,
  HomeLabels,
  ServicesLabels,
  AboutLabels,
  PortalLabels,
  StoreLabels,
  CartLabels,
  CheckoutLabels,
  BookingLabels,
  CommonLabels,
  AuthLabels,
  ToolsLabels,
  ErrorLabels,
  DashboardLabels,
}
