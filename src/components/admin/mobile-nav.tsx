'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AdminSidebarNav } from '@/components/admin/sidebar-nav';
import { Menu } from 'lucide-react';

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              Fun4Me Admin
            </SheetTitle>
          </SheetHeader>
          <div onClick={() => setOpen(false)}>
            <AdminSidebarNav />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
