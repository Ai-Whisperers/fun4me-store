import { createClient } from '@/lib/supabase/server';
import { ProductForm } from '@/components/admin/product-form';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductoEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const isNew = id === 'nuevo';

  // Fetch categories for the form
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  const categories = ((categoriesData as any[]) || [])
    .filter((c) => c.is_active)
    .map((c) => ({ id: c.id, name: c.name }));

  let product = null;

  if (!isNew) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      notFound();
    }
    product = data as any;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isNew ? 'Nuevo Producto' : 'Editar Producto'}
        </h2>
        <p className="text-muted-foreground">
          {isNew
            ? 'Agrega un nuevo producto al catálogo'
            : `Editando: ${product?.name}`}
        </p>
      </div>

      <ProductForm
        product={product}
        categories={categories || []}
        isNew={isNew}
      />
    </div>
  );
}
