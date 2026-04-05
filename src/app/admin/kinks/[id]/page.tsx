import { createClient } from '@/lib/supabase/server';
import { KinkForm } from '@/components/admin/kink-form';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KinkEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const isNew = id === 'nueva';

  let kink = null;

  if (!isNew) {
    const { data, error } = await (supabase as any)
      .from('kink_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      notFound();
    }
    kink = data as any;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isNew ? 'Nuevo Kink' : 'Editar Kink'}
        </h2>
        <p className="text-muted-foreground">
          {isNew
            ? 'Crea una nueva categoría de kink'
            : `Editando: ${kink?.name}`}
        </p>
      </div>

      <KinkForm kink={kink} isNew={isNew} />
    </div>
  );
}
