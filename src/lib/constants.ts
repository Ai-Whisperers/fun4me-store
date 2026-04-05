export const STORE_NAME = 'Fun4Me Store';

export const WHATSAPP_NUMBER = '+595 976 569 739';

export const FREE_SHIPPING_THRESHOLD = 300_000;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://fun4me.sunstein.cloud';

export const CURRENCY = {
  code: 'PYG',
  symbol: '₲',
  name: 'Guaraní',
  locale: 'es-PY',
} as const;

export const STORE_CONFIG = {
  name: STORE_NAME,
  description:
    'Tu tienda online en Paraguay - Productos divertidos para toda la familia',
  country: 'Paraguay',
  city: 'Asunción',
  whatsapp: WHATSAPP_NUMBER,
  email: 'contacto@fun4me.com',
} as const;

export const PAGINATION = {
  defaultPageSize: 12,
  maxPageSize: 50,
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
