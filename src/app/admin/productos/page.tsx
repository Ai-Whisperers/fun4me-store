import { createClient } from '@/lib/supabase/server';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';

export default async function ProductosPage() {
  const supabase = await createClient();

  const { data: productsData } = await supabase
    .from('products')
    .select('*, categories(name)')
    .order('created_at', { ascending: false });

  const products = (productsData as any[]) || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Productos</h2>
          <p className="text-muted-foreground">
            Gestiona el catálogo de productos de tu tienda
          </p>
        </div>
        <Link href="/admin/productos/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Destacado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images && product.images[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatPrice(product.price)}</p>
                      {product.compare_at_price && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.compare_at_price)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        product.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : product.stock < 5
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {(product.categories as any)?.name || 'Sin categoría'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.is_featured && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-medium">
                        ⭐ Destacado
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/productos/${product.id}`}>
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
                    No hay productos registrados
                  </p>
                  <Link href="/admin/productos/nuevo" className="mt-2 inline-block">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Crear primer producto
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
