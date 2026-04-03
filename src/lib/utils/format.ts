import { CURRENCY } from '@/lib/constants';

/**
 * Formats a number as Paraguayan Guaraníes (₲)
 * Guaraníes don't use decimal places
 *
 * @example formatPrice(150000) => "₲ 150.000"
 * @example formatPrice(1500000) => "₲ 1.500.000"
 */
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat('es-PY', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return `${CURRENCY.symbol} ${formatted}`;
}

/**
 * Formats a number as compact Guaraníes for display
 *
 * @example formatPriceCompact(1500000) => "₲ 1,5M"
 */
export function formatPriceCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${CURRENCY.symbol} ${millions.toFixed(1).replace('.', ',')}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `${CURRENCY.symbol} ${thousands.toFixed(0)}K`;
  }
  return formatPrice(amount);
}

/**
 * Parse a price string back to number
 */
export function parsePrice(priceString: string): number {
  const cleaned = priceString.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}
