import Link from 'next/link';
import { Search, Home } from 'lucide-react';

export default function StoreNotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-purple-600">
        <Search className="h-10 w-10 text-white" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">Página no encontrada</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        La página que buscás no existe o fue movida. ¡Explorá nuestra tienda y encontrá algo que te guste!
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-purple-600 px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Home className="h-4 w-4" />
        Volver al inicio
      </Link>
    </div>
  );
}
