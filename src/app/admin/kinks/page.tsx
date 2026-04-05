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

export default async function KinksPage() {
  const supabase = await createClient();

  const { data: kinksData } = await (supabase as any)
    .from('kink_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const kinks = (kinksData as any[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Kinks</h2>
          <p className="text-muted-foreground">
            Gestiona las categorías de kinks
          </p>
        </div>
        <Link href="/admin/kinks/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Kink
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kinks.length > 0 ? (
              kinks.map((kink: any) => (
                <TableRow key={kink.id}>
                  <TableCell>
                    {kink.image_url ? (
                      <img
                        src={kink.image_url}
                        alt={kink.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{kink.name}</p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {kink.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{kink.sort_order ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        kink.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {kink.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/kinks/${kink.id}`}>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No hay kinks registrados
                  </p>
                  <Link href="/admin/kinks/nueva" className="mt-2 inline-block">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Crear primer kink
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
