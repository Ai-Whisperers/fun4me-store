import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import ConfirmacionClient from './confirmacion-client';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function ConfirmacionPage({ searchParams }: Props) {
  const { id } = await searchParams;

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingCart className="mx-auto mb-6 h-24 w-24 text-muted-foreground/20" />
        <h1 className="text-2xl font-bold">No hay pedido reciente</h1>
        <p className="mt-2 text-muted-foreground">
          Parece que no tenés un pedido pendiente.
        </p>
        <Link href="/">
          <Button className="mt-6 bg-gradient-to-r from-rose-500 to-purple-600 text-white">
            Ir a la Tienda
          </Button>
        </Link>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: orderData, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !orderData) {
    redirect('/');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = orderData as any;

  // Extraer items del campo JSONB del pedido
  const items = (order.items as Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>) || [];

  const orderForClient = {
    id: order.id as string,
    customer_name: (order.customer_name as string) || '',
    customer_phone: (order.customer_phone as string) || '',
    customer_email: (order.customer_email as string | null) || null,
    shipping_address: order.shipping_address as {
      address: string;
      city: string;
      neighborhood: string;
    } | null,
    shipping_zone: (order.shipping_zone as string | null) || null,
    shipping_cost: (order.shipping_cost as number) || 0,
    payment_method: (order.payment_method as string) || 'cod',
    subtotal: (order.subtotal as number) || 0,
    total: (order.total as number) || 0,
    status: (order.status as string) || 'pending',
    notes: (order.notes as string | null) || null,
    created_at: order.created_at as string,
    items,
  };

  return <ConfirmacionClient order={orderForClient} />;
}
