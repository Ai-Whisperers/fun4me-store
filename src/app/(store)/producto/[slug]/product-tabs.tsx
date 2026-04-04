'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  description: string | null;
  specifications: Record<string, unknown> | null;
  careInstructions: string | null;
  material: string | null;
}

export function ProductTabs({ description, specifications, careInstructions, material }: Props) {
  const [activeTab, setActiveTab] = useState('descripcion');

  const tabs = [
    { id: 'descripcion', label: 'Descripción' },
    { id: 'especificaciones', label: 'Especificaciones' },
    { id: 'cuidados', label: 'Cuidados' },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-rose-500 text-rose-600'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'descripcion' && (
          <div className="prose prose-sm max-w-none">
            {description ? (
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{description}</p>
            ) : (
              <p className="text-muted-foreground">No hay descripción disponible para este producto.</p>
            )}
          </div>
        )}

        {activeTab === 'especificaciones' && (
          <div className="space-y-3">
            {material && (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <span className="text-sm font-medium">Material</span>
                <span className="text-sm text-muted-foreground">{material}</span>
              </div>
            )}
            {specifications && Object.entries(specifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <span className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm text-muted-foreground">{String(value)}</span>
              </div>
            ))}
            {!material && (!specifications || Object.keys(specifications).length === 0) && (
              <p className="text-muted-foreground">No hay especificaciones disponibles.</p>
            )}
          </div>
        )}

        {activeTab === 'cuidados' && (
          <div className="prose prose-sm max-w-none">
            {careInstructions ? (
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{careInstructions}</p>
            ) : (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Limpieza:</strong> Lavar con agua tibia y jabon neutro antes y despues de cada uso.</p>
                <p><strong>Lubricantes:</strong> Usar lubricante a base de agua para mayor durabilidad del producto.</p>
                <p><strong>Almacenamiento:</strong> Guardar en un lugar seco y fresco, de preferencia en su empaque original.</p>
                <p><strong>Importante:</strong> No compartir sin proteccion adecuada. Revisar regularmente el estado del producto.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
