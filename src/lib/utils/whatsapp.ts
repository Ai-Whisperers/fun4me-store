import { WHATSAPP_NUMBER } from '@/lib/constants';
import type { CartItem } from '@/lib/store/cart';
import { formatPrice } from '@/lib/utils/format';

/**
 * Generates a WhatsApp link with a pre-filled message
 */
export function generateWhatsAppLink(message: string): string {
  const encodedMessage = encodeURIComponent(message);
  const cleanNumber = WHATSAPP_NUMBER.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
}

/**
 * Generates a WhatsApp order message from cart items
 */
export function generateOrderMessage(
  items: CartItem[],
  customerName?: string,
): string {
  const header = '🛒 *Nuevo Pedido - Fun4Me Store*\n\n';
  const customerLine = customerName ? `👤 *Cliente:* ${customerName}\n\n` : '';

  const itemLines = items
    .map(
      (item, index) =>
        `${index + 1}. ${item.name}\n   Cantidad: ${item.quantity} | Precio: ${formatPrice(item.price * item.quantity)}`,
    )
    .join('\n\n');

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const totalLine = `\n\n💰 *Total: ${formatPrice(total)}*`;

  return `${header}${customerLine}${itemLines}${totalLine}`;
}

/**
 * Generates a WhatsApp link for placing an order
 */
export function generateOrderWhatsAppLink(
  items: CartItem[],
  customerName?: string,
): string {
  const message = generateOrderMessage(items, customerName);
  return generateWhatsAppLink(message);
}
