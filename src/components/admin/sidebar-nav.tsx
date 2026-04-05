'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  FolderTree,
  Heart,
  Ticket,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const navItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Productos',
    href: '/admin/productos',
    icon: Package,
  },
  {
    label: 'Pedidos',
    href: '/admin/pedidos',
    icon: ShoppingCart,
  },
  {
    label: 'Categorías',
    href: '/admin/categorias',
    icon: FolderTree,
  },
  {
    label: 'Kinks',
    href: '/admin/kinks',
    icon: Heart,
  },
  {
    label: 'Cupones',
    href: '/admin/cupones',
    icon: Ticket,
  },
  {
    label: 'Anuncios',
    href: '/admin/anuncios',
    icon: Megaphone,
  },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full">
      <div className="space-y-1 p-4 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-3">
          Menú Principal
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Volver a la tienda
        </Link>
      </div>
    </nav>
  );
}
