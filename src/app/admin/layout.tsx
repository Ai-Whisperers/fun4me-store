import { Separator } from '@/components/ui/separator';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-muted/40 md:block">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Fun4Me Admin</h2>
        </div>
        <nav className="space-y-1 p-4">
          <p className="text-sm text-muted-foreground px-2 py-1">
            Panel de administración
          </p>
          <Separator />
          {/* Admin nav items will be added here */}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b px-6">
          <h1 className="text-lg font-semibold">Panel de Administración</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
