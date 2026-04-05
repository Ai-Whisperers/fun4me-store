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

export default async function CategoriasPage() {
  const supabase = await createClient();

  const { data: categoriesData } = await (supabase as any)
    .from('categories')
    .select('*, products(count)')
    .order('sort_order', { ascending: true });

  const categories = (categoriesData as any[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categorías</h2>
          <p className="text-muted-foreground">
            Gestiona las categorías de tu tienda
          </p>
        </div>
        <Link href="/admin/categorias/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
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
              <TableHead>Productos</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length > 0 ? (
              categories.map((category: any) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{category.name}</p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {category.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {category.products?.[0]?.count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{category.sort_order ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        category.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/categorias/${category.id}`}>
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
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No hay categorías registradas
                  </p>
                  <Link href="/admin/categorias/nueva" className="mt-2 inline-block">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Crear primera categoría
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
