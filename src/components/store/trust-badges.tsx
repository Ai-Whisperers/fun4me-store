export function TrustBadges() {
  const badges = [
    { emoji: '📦', title: 'Envío Discreto', desc: 'Empaque sin marcas visibles' },
    { emoji: '🔒', title: 'Pago Seguro', desc: 'Transacciones protegidas' },
    { emoji: '🇵🇾', title: 'Empresa Paraguaya', desc: 'Envíos a todo el país' },
    { emoji: '✅', title: 'Garantía', desc: 'Satisfacción garantizada' },
  ];

  return (
    <section className="border-y bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {badges.map((b) => (
            <div key={b.title} className="flex flex-col items-center text-center">
              <span className="mb-2 text-4xl">{b.emoji}</span>
              <h3 className="text-sm font-semibold">{b.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
