import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* ── Rate limiting ─────────────────────────────────────────── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Limpiar entradas expiradas cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

/* ── Types ─────────────────────────────────────────────────── */
interface CheckoutItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutBody {
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  shipping_address: {
    address: string;
    city: string;
    neighborhood: string;
  };
  shipping_zone: string;
  shipping_cost: number;
  payment_method: string;
  subtotal: number;
  total: number;
  notes?: string;
  items: CheckoutItem[];
}

/* ── POST /api/checkout ────────────────────────────────────── */
export async function POST(request: NextRequest) {
  /* Rate limiting */
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados pedidos. Intentá de nuevo más tarde.' },
      { status: 429 },
    );
  }

  try {
    const supabase = await createClient();

    /* ── Parse body (podría ser JSON o FormData si hay comprobante) ── */
    const contentType = request.headers.get('content-type') || '';
    let body: CheckoutBody;
    let receiptFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const orderDataRaw = formData.get('order_data');
      if (!orderDataRaw || typeof orderDataRaw !== 'string') {
        return NextResponse.json(
          { error: 'Datos del pedido no proporcionados.' },
          { status: 400 },
        );
      }
      body = JSON.parse(orderDataRaw) as CheckoutBody;
      const file = formData.get('receipt');
      if (file && file instanceof File) {
        receiptFile = file;
      }
    } else {
      body = (await request.json()) as CheckoutBody;
    }

    /* ── Validación básica ────────────────────────────────────── */
    if (!body.customer_name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio.' },
        { status: 400 },
      );
    }
    if (!body.customer_phone?.trim()) {
      return NextResponse.json(
        { error: 'El teléfono es obligatorio.' },
        { status: 400 },
      );
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'El carrito está vacío.' },
        { status: 400 },
      );
    }
    if (!body.payment_method) {
      return NextResponse.json(
        { error: 'Seleccioná un método de pago.' },
        { status: 400 },
      );
    }

    /* ── Validar stock disponible ─────────────────────────────── */
    const productIds = body.items.map((item) => item.product_id);
    const { data: products, error: productsError } = await (supabase
      .from('products') as any)
      .select('id, name, stock, price')
      .in('id', productIds) as { data: Array<{id: string; name: string; stock: number; price: number}> | null; error: any };

    if (productsError || !products) {
      console.error('Error al verificar productos:', productsError);
      return NextResponse.json(
        { error: 'Error al verificar disponibilidad de productos.' },
        { status: 500 },
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of body.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return NextResponse.json(
          {
            error: `El producto "${item.name}" ya no está disponible.`,
            code: 'PRODUCT_NOT_FOUND',
          },
          { status: 400 },
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            error:
              product.stock === 0
                ? `"${product.name}" está agotado.`
                : `Solo quedan ${product.stock} unidades de "${product.name}".`,
            code: 'INSUFFICIENT_STOCK',
            product_id: item.product_id,
            available: product.stock,
          },
          { status: 400 },
        );
      }
    }

    /* ── Construir items con datos del servidor (precio real) ── */
    const orderItems = body.items.map((item) => {
      const product = productMap.get(item.product_id)!;
      return {
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: product.price * item.quantity,
      };
    });

    const serverSubtotal = orderItems.reduce((sum, i) => sum + i.total_price, 0);
    const serverTotal = serverSubtotal + body.shipping_cost;

    /* ── Insertar orden ───────────────────────────────────────── */
    const { data: order, error: orderError } = await (supabase
      .from('orders') as any)
      .insert({
        customer_name: body.customer_name.trim(),
        customer_email: body.customer_email?.trim() || null,
        customer_phone: body.customer_phone.trim(),
        shipping_address: body.shipping_address,
        shipping_zone: body.shipping_zone,
        shipping_cost: body.shipping_cost,
        payment_method: body.payment_method,
        subtotal: serverSubtotal,
        total: serverTotal,
        status: 'pending',
        notes: body.notes?.trim() || null,
        items: orderItems,
      })
      .select()
      .single() as { data: Record<string, any> | null; error: any };

    if (orderError || !order) {
      console.error('Error al crear el pedido:', orderError);
      return NextResponse.json(
        { error: 'Error al crear el pedido. Intentá de nuevo.' },
        { status: 500 },
      );
    }

    /* ── Decrementar stock ────────────────────────────────────── */
    for (const item of body.items) {
      const product = productMap.get(item.product_id)!;
      const newStock = product.stock - item.quantity;

      const { error: stockError } = await (supabase
        .from('products') as any)
        .update({ stock: newStock })
        .eq('id', item.product_id);

      if (stockError) {
        console.error(
          `Error al actualizar stock de ${item.product_id}:`,
          stockError,
        );
        // No fallamos la orden por esto, pero lo logueamos
      }
    }

    /* ── Subir comprobante si existe ──────────────────────────── */
    let receiptUrl: string | null = null;
    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop() || 'jpg';
      const filePath = `${order.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error al subir comprobante:', uploadError);
        // No fallamos la orden por esto
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from('receipts').getPublicUrl(filePath);
        receiptUrl = publicUrl;

        // Actualizar la orden con la referencia del comprobante
        await (supabase
          .from('orders') as any)
          .update({ payment_ref: receiptUrl })
          .eq('id', order.id);
      }
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          status: 'pending',
          total: serverTotal,
        },
        receipt_url: receiptUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error inesperado en checkout:', error);
    return NextResponse.json(
      { error: 'Error inesperado. Por favor intentá de nuevo.' },
      { status: 500 },
    );
  }
}
