'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function Newsletter() {
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      toast.success('¡Gracias por suscribirte! Te enviaremos las mejores ofertas.');
      setEmail('');
    }
  }

  return (
    <section className="bg-gradient-to-r from-rose-500 to-purple-600 py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Recibí Ofertas Exclusivas
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
          Suscribite a nuestro newsletter y recibí descuentos especiales, novedades y consejos de bienestar íntimo.
        </p>
        <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-md gap-2">
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-white/30 bg-white/20 text-white placeholder:text-white/60"
            required
          />
          <Button type="submit" className="shrink-0 bg-white text-rose-600 hover:bg-white/90">
            Suscribirme
          </Button>
        </form>
        <p className="mt-3 text-xs text-white/60">
          Sin spam. Podés darte de baja cuando quieras.
        </p>
      </div>
    </section>
  );
}
