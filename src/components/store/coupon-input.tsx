'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils/format';
import { Tag, X, Loader2 } from 'lucide-react';

export interface AppliedCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  discountAmount: number;
}

interface CouponInputProps {
  orderTotal: number;
  onCouponApplied: (coupon: AppliedCoupon | null) => void;
}

export function CouponInput({ orderTotal, onCouponApplied }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  async function handleApply() {
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data, error: queryError } = await (supabase as any)
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (queryError || !data) {
        setError('Cupón no encontrado o no válido');
        setLoading(false);
        return;
      }

      const coupon = data as any;

      // Check expiration
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        setError('Este cupón ya expiró');
        setLoading(false);
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
        setError('Este cupón ya alcanzó su límite de usos');
        setLoading(false);
        return;
      }

      // Check minimum order
      if (coupon.min_order && orderTotal < coupon.min_order) {
        setError(`Pedido mínimo de ${formatPrice(coupon.min_order)} requerido`);
        setLoading(false);
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.type === 'percentage') {
        discountAmount = Math.round((orderTotal * coupon.value) / 100);
      } else if (coupon.type === 'fixed') {
        discountAmount = Math.min(coupon.value, orderTotal);
      }
      // free_shipping: discountAmount stays 0, but type indicates free shipping

      const applied: AppliedCoupon = {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
      };

      setAppliedCoupon(applied);
      onCouponApplied(applied);
    } catch {
      setError('Error al validar el cupón');
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    setAppliedCoupon(null);
    setCode('');
    setError('');
    onCouponApplied(null);
  }

  if (appliedCoupon) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Cupón aplicado: <strong>{appliedCoupon.code}</strong>
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-600 hover:text-green-800 transition-colors"
            aria-label="Quitar cupón"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-green-700">
          {appliedCoupon.type === 'percentage'
            ? `${appliedCoupon.value}% de descuento — Ahorrás ${formatPrice(appliedCoupon.discountAmount)}`
            : appliedCoupon.type === 'fixed'
              ? `Descuento de ${formatPrice(appliedCoupon.discountAmount)}`
              : '¡Envío gratis!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">¿Tenés un cupón de descuento?</label>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError('');
          }}
          placeholder="Ingresá tu código"
          className="uppercase"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={loading || !code.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
