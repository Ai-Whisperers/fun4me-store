'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const statuses = [
  { value: 'todos', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function OrderStatusFilter({
  currentStatus,
}: {
  currentStatus: string;
}) {
  const router = useRouter();

  const handleFilter = (status: string) => {
    if (status === 'todos') {
      router.push('/admin/pedidos');
    } else {
      router.push(`/admin/pedidos?status=${status}`);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <Button
          key={s.value}
          variant={currentStatus === s.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilter(s.value)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
