'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

const statuses = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function OrderStatusUpdate({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (status === currentStatus) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await (supabase
        .from('orders') as any)
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      setMessage('Estado actualizado correctamente');
      router.refresh();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Button
        onClick={handleUpdate}
        disabled={loading || status === currentStatus}
        className="w-full"
        size="sm"
      >
        <Save className="h-4 w-4 mr-1" />
        {loading ? 'Actualizando...' : 'Actualizar Estado'}
      </Button>

      {message && (
        <p
          className={`text-xs ${
            message.startsWith('Error')
              ? 'text-red-600'
              : 'text-green-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
