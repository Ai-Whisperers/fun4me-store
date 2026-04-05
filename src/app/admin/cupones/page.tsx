import { createClient } from '@/lib/supabase/server';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';

function formatCouponValue(type: string, value: number): string {
  if (type === 'percentage') return `${value}%`;
  if (type === 'fixed') return formatPrice(value);
  if (type === 'free_shipping') return 'Envío gratis';
  return String(value);
}

function formatCouponType(type: string): string {
  if (type === 'percentage') return 'Porcentaje';
  if (type === 'fixed') return 'Monto fijo';
  if (type === 'free_shipping') return 'Envío gratis';
  return type;
}

export default async function CuponesPage() {
  const supabase = await createClient();

  const { data: couponsData } = await (supabase as any)
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  const coupons = (couponsData as any[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cupones</h2>
          <p className="text-muted-foreground">
            Gestiona los cupones de descuento
          </p>
        </div>
        <Link href="/admin/cupones/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cupón
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length > 0 ? (
              coupons.map((coupon: any) => {
                const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                const isMaxedOut = coupon.max_uses && coupon.uses_count >= coupon.max_uses;
                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <code className="text-sm font-bold bg-muted px-2 py-0.5 rounded">
                        {coupon.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatCouponType(coupon.type)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {formatCouponValue(coupon.type, coupon.value)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {coupon.uses_count ?? 0}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : ' / ∞'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${isExpired ? 'text-red-500' : ''}`}>
                        {coupon.expires_at
                          ? new Date(coupon.expires_at).toLocaleDateString('es-PY')
                          : 'Sin expiración'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          !coupon.is_active || isExpired || isMaxedOut
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {!coupon.is_active
                          ? 'Inactivo'
                          : isExpired
                            ? 'Expirado'
                            : isMaxedOut
                              ? 'Agotado'
                              : 'Activo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/cupones/${coupon.id}`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No hay cupones registrados
                  </p>
                  <Link href="/admin/cupones/nuevo" className="mt-2 inline-block">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Crear primer cupón
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
