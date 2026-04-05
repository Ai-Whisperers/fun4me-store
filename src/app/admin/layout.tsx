import { AdminSidebarNav } from '@/components/admin/sidebar-nav';
import { AdminMobileNav } from '@/components/admin/mobile-nav';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-muted/40 md:block">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Fun4Me Admin
          </h2>
        </div>
        <AdminSidebarNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b px-6 gap-4">
          <AdminMobileNav />
          <h1 className="text-lg font-semibold">Panel de Administración</h1>
        </header>
        <main className="flex-1 p-6 bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
