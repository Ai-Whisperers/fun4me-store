'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface KinkFormProps {
  kink: any | null;
  isNew: boolean;
}

export function KinkForm({ kink, isNew }: KinkFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(kink?.name || '');
  const [slug, setSlug] = useState(kink?.slug || '');
  const [description, setDescription] = useState(kink?.description || '');
  const [imageUrl, setImageUrl] = useState(kink?.image_url || '');
  const [sortOrder, setSortOrder] = useState<number>(kink?.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(kink?.is_active ?? true);

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function handleNameChange(value: string) {
    setName(value);
    if (isNew || !kink?.slug) {
      setSlug(generateSlug(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      slug,
      description: description || null,
      image_url: imageUrl || null,
      sort_order: sortOrder,
      is_active: isActive,
    };

    try {
      if (isNew) {
        const { error } = await (supabase as any)
          .from('kink_categories')
          .insert(payload);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('kink_categories')
          .update(payload)
          .eq('id', kink.id);
        if (error) throw error;
      }
      router.push('/admin/kinks');
      router.refresh();
    } catch (err: any) {
      alert('Error al guardar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar este kink?')) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('kink_categories')
        .delete()
        .eq('id', kink.id);
      if (error) throw error;
      router.push('/admin/kinks');
      router.refresh();
    } catch (err: any) {
      alert('Error al eliminar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: BDSM"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="bdsm"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del kink..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image_url">URL de imagen</Label>
          <Input
            id="image_url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Vista previa"
              className="h-20 w-20 rounded-lg object-cover mt-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sort_order">Orden de aparición</Label>
          <Input
            id="sort_order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={isActive}
            onCheckedChange={(val) => setIsActive(!!val)}
          />
          <Label>Kink activo</Label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/admin/kinks">
          <Button type="button" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
        {!isNew && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
