import { createClient } from '@/lib/supabase/server';
import { CouponForm } from '@/components/admin/coupon-form';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CuponEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const isNew = id === 'nuevo';

  let coupon = null;

  if (!isNew) {
    const { data, error } = await (supabase as any)
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      notFound();
    }
    coupon = data as any;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isNew ? 'Nuevo Cupón' : 'Editar Cupón'}
        </h2>
        <p className="text-muted-foreground">
          {isNew
            ? 'Crea un nuevo cupón de descuento'
            : `Editando cupón: ${coupon?.code}`}
        </p>
      </div>

      <CouponForm coupon={coupon} isNew={isNew} />
    </div>
  );
}
