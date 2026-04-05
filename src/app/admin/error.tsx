'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600">
        <AlertTriangle className="h-10 w-10 text-white" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">Error en el panel</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Ocurrió un error inesperado en el panel de administración. Por favor intentá de nuevo.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </button>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Home className="h-4 w-4" />
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
