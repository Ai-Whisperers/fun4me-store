import { Package, Lock, MapPin, ShieldCheck } from 'lucide-react';

export function TrustBadges() {
  const badges = [
    { icon: Package, title: 'Envio Discreto', desc: 'Empaque sin marcas visibles' },
    { icon: Lock, title: 'Pago Seguro', desc: 'Transacciones protegidas' },
    { icon: MapPin, title: 'Empresa Paraguaya', desc: 'Envios a todo el pais' },
    { icon: ShieldCheck, title: 'Garantia', desc: 'Satisfaccion garantizada' },
  ];

  return (
    <section className="border-y bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {badges.map((b) => (
            <div key={b.title} className="flex flex-col items-center text-center">
              <b.icon className="mb-2 h-8 w-8 text-rose-500" />
              <h3 className="text-sm font-semibold">{b.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
