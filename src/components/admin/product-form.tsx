'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface ProductFormProps {
  product: any | null;
  categories: { id: string; name: string }[];
  isNew: boolean;
}

export function ProductForm({ product, categories, isNew }: ProductFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    short_description: product?.short_description || '',
    price: product?.price || 0,
    compare_at_price: product?.compare_at_price || '',
    category_id: product?.category_id || '',
    stock: product?.stock || 0,
    sku: product?.sku || '',
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    images: product?.images?.join(', ') || '',
    material: product?.material || '',
    experience_level: product?.experience_level || '',
    is_body_safe: product?.is_body_safe ?? false,
    care_instructions: product?.care_instructions || '',
    emoji: product?.emoji || '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: isNew ? generateSlug(value) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const imagesArray = formData.images
        .split(',')
        .map((img: string) => img.trim())
        .filter(Boolean);

      const productData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        short_description: formData.short_description || null,
        price: Number(formData.price),
        compare_at_price: formData.compare_at_price
          ? Number(formData.compare_at_price)
          : null,
        category_id: formData.category_id || null,
        stock: Number(formData.stock),
        sku: formData.sku || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        images: imagesArray,
        material: formData.material || null,
        experience_level: formData.experience_level || null,
        is_body_safe: formData.is_body_safe,
        care_instructions: formData.care_instructions || null,
        emoji: formData.emoji || null,
      };

      if (isNew) {
        const { error: insertError } = await (supabase
          .from('products') as any)
          .insert(productData);
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await (supabase
          .from('products') as any)
          .update(productData)
          .eq('id', product.id);
        if (updateError) throw updateError;
      }

      router.push('/admin/productos');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      if (deleteError) throw deleteError;

      router.push('/admin/productos');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el producto');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Link href="/admin/productos">
          <Button type="button" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
        <div className="flex-1" />
        {!isNew && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-1" />
          {loading ? 'Guardando...' : 'Guardar Producto'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nombre del producto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="nombre-del-producto"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_description">Descripción Corta</Label>
              <Input
                id="short_description"
                value={formData.short_description}
                onChange={(e) =>
                  setFormData({ ...formData, short_description: e.target.value })
                }
                placeholder="Breve descripción del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción Completa</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción detallada del producto"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={formData.emoji}
                onChange={(e) =>
                  setFormData({ ...formData, emoji: e.target.value })
                }
                placeholder="🎉"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Precio e Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (₲) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_at_price">Precio Anterior (₲)</Label>
                <Input
                  id="compare_at_price"
                  type="number"
                  value={formData.compare_at_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      compare_at_price: e.target.value,
                    })
                  }
                  placeholder="Precio tachado"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="SKU-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría</Label>
              <select
                id="category_id"
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">Imágenes (URLs separadas por coma)</Label>
              <Textarea
                id="images"
                value={formData.images}
                onChange={(e) =>
                  setFormData({ ...formData, images: e.target.value })
                }
                placeholder="https://ejemplo.com/img1.jpg, https://ejemplo.com/img2.jpg"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                value={formData.material}
                onChange={(e) =>
                  setFormData({ ...formData, material: e.target.value })
                }
                placeholder="Silicona médica, ABS, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience_level">Nivel de Experiencia</Label>
              <select
                id="experience_level"
                value={formData.experience_level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    experience_level: e.target.value,
                  })
                }
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Seleccionar nivel</option>
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="care_instructions">Instrucciones de Cuidado</Label>
              <Textarea
                id="care_instructions"
                value={formData.care_instructions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    care_instructions: e.target.value,
                  })
                }
                placeholder="Instrucciones de limpieza y mantenimiento"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status & Toggles */}
        <Card>
          <CardHeader>
            <CardTitle>Estado y Visibilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Producto Activo</Label>
                <p className="text-sm text-muted-foreground">
                  El producto será visible en la tienda
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Producto Destacado</Label>
                <p className="text-sm text-muted-foreground">
                  Se mostrará en la página principal
                </p>
              </div>
              <Switch
                checked={formData.is_featured}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_featured: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Body Safe</Label>
                <p className="text-sm text-muted-foreground">
                  Materiales seguros para el cuerpo
                </p>
              </div>
              <Switch
                checked={formData.is_body_safe}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_body_safe: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
