'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function AgeVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  function handleVerify() {
    setError('');
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
      setError('Por favor ingresá una fecha válida.');
      return;
    }

    const birthDate = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('Debés ser mayor de 18 años para acceder a este sitio.');
      return;
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    document.cookie = `age-verified=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

    router.push(redirect);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 text-5xl">🔞</div>
        <CardTitle className="text-2xl">Verificación de Edad</CardTitle>
        <CardDescription>
          Confirma que sos mayor de 18 años para acceder a Fun4Me Store
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-center text-sm text-muted-foreground">
          Este sitio contiene productos para adultos. Ingresá tu fecha de nacimiento para continuar.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Día</label>
            <Input
              type="number"
              placeholder="DD"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="text-center"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Mes</label>
            <Input
              type="number"
              placeholder="MM"
              min="1"
              max="12"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-center"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Año</label>
            <Input
              type="number"
              placeholder="AAAA"
              min="1900"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="text-center"
            />
          </div>
        </div>

        {error && (
          <p className="text-center text-sm text-red-500">{error}</p>
        )}

        <Button
          onClick={handleVerify}
          className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white hover:from-rose-600 hover:to-purple-700"
          size="lg"
        >
          Soy mayor de 18 años - Entrar
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Al ingresar, confirmás que tenés la edad legal para ver contenido para adultos en Paraguay.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AgeVerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-500 to-purple-600 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-12">
            <p className="text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      }>
        <AgeVerificationForm />
      </Suspense>
    </div>
  );
}
