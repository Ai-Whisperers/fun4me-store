'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  text: string;
  is_active: boolean;
  sort_order: number;
}

export function AnunciosManager() {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('announcements')
      .select('*')
      .order('sort_order', { ascending: true });
    setAnnouncements((data as Announcement[]) || []);
    setLoading(false);
  }

  function addAnnouncement() {
    setAnnouncements((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        text: '',
        is_active: true,
        sort_order: prev.length,
      },
    ]);
  }

  function updateAnnouncement(index: number, updates: Partial<Announcement>) {
    setAnnouncements((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...updates } : a))
    );
  }

  function removeAnnouncement(index: number) {
    setAnnouncements((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await (supabase as any).from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const toInsert = announcements
        .filter((a) => a.text.trim())
        .map((a, index) => ({
          text: a.text,
          is_active: a.is_active,
          sort_order: index,
        }));

      if (toInsert.length > 0) {
        const { error } = await (supabase as any)
          .from('announcements')
          .insert(toInsert);
        if (error) throw error;
      }

      await loadAnnouncements();
      alert('Anuncios guardados correctamente');
    } catch (err: any) {
      alert('Error al guardar: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Anuncios</h2>
          <p className="text-muted-foreground">
            Gestiona los mensajes de la barra de anuncios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addAnnouncement}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Todo'}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Cargando...</p>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No hay anuncios</p>
            <Button variant="outline" onClick={addAnnouncement}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer anuncio
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Los anuncios activos rotarán cada 5 segundos en la barra superior de la tienda.
            </p>
            {announcements.map((announcement, index) => (
              <div
                key={announcement.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="text-xs text-muted-foreground w-6 text-center font-mono">
                  {index + 1}
                </span>
                <Input
                  value={announcement.text}
                  onChange={(e) =>
                    updateAnnouncement(index, { text: e.target.value })
                  }
                  placeholder="Texto del anuncio..."
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={announcement.is_active}
                    onCheckedChange={(val) =>
                      updateAnnouncement(index, { is_active: !!val })
                    }
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {announcement.is_active ? 'Activo' : 'Off'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAnnouncement(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
