'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface CouponFormProps {
  coupon: any | null;
  isNew: boolean;
}

export function CouponForm({ coupon, isNew }: CouponFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(coupon?.code || '');
  const [type, setType] = useState(coupon?.type || 'percentage');
  const [value, setValue] = useState<number>(coupon?.value ?? 0);
  const [minOrder, setMinOrder] = useState<number>(coupon?.min_order ?? 0);
  const [maxUses, setMaxUses] = useState<number | ''>(coupon?.max_uses ?? '');
  const [expiresAt, setExpiresAt] = useState(
    coupon?.expires_at ? coupon.expires_at.slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState<boolean>(coupon?.is_active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload: any = {
      code: code.toUpperCase().trim(),
      type,
      value,
      min_order: minOrder || 0,
      max_uses: maxUses === '' ? null : Number(maxUses),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: isActive,
    };

    try {
      if (isNew) {
        payload.uses_count = 0;
        const { error } = await (supabase as any)
          .from('coupons')
          .insert(payload);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('coupons')
          .update(payload)
          .eq('id', coupon.id);
        if (error) throw error;
      }
      router.push('/admin/cupones');
      router.refresh();
    } catch (err: any) {
      alert('Error al guardar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar este cupón?')) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('coupons')
        .delete()
        .eq('id', coupon.id);
      if (error) throw error;
      router.push('/admin/cupones');
      router.refresh();
    } catch (err: any) {
      alert('Error al eliminar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código del cupón</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej: DESCUENTO10"
            className="uppercase"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Tipo de descuento</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed">Monto fijo (₲)</option>
            <option value="free_shipping">Envío gratis</option>
          </select>
        </div>

        {type !== 'free_shipping' && (
          <div className="space-y-2">
            <Label htmlFor="value">
              {type === 'percentage' ? 'Porcentaje de descuento' : 'Monto de descuento (₲)'}
            </Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(parseInt(e.target.value) || 0)}
              placeholder={type === 'percentage' ? 'Ej: 10' : 'Ej: 50000'}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="min_order">Pedido mínimo (₲)</Label>
          <Input
            id="min_order"
            type="number"
            value={minOrder}
            onChange={(e) => setMinOrder(parseInt(e.target.value) || 0)}
            placeholder="0 = sin mínimo"
          />
          <p className="text-xs text-muted-foreground">
            Monto mínimo de pedido para aplicar el cupón. Dejá en 0 para sin mínimo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_uses">Usos máximos</Label>
          <Input
            id="max_uses"
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
            placeholder="Vacío = sin límite"
          />
          <p className="text-xs text-muted-foreground">
            Dejá vacío para uso ilimitado.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires_at">Fecha de expiración</Label>
          <Input
            id="expires_at"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Dejá vacío para que no expire.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={isActive}
            onCheckedChange={(val) => setIsActive(!!val)}
          />
          <Label>Cupón activo</Label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/admin/cupones">
          <Button type="button" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
        {!isNew && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
