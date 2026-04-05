import { createClient } from '@/lib/supabase/server';
import { CategoryForm } from '@/components/admin/category-form';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CategoriaEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const isNew = id === 'nueva';

  let category = null;

  if (!isNew) {
    const { data, error } = await (supabase as any)
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      notFound();
    }
    category = data as any;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isNew ? 'Nueva Categoría' : 'Editar Categoría'}
        </h2>
        <p className="text-muted-foreground">
          {isNew
            ? 'Crea una nueva categoría para tu tienda'
            : `Editando: ${category?.name}`}
        </p>
      </div>

      <CategoryForm category={category} isNew={isNew} />
    </div>
  );
}
