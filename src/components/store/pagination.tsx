'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

export function Pagination({ currentPage, totalPages, totalItems, pageSize }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers to show
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Mostrando {from}-{to} de {totalItems} productos
      </p>
      <div className="flex items-center justify-center gap-1">
        {currentPage > 1 ? (
          <Link href={buildHref(currentPage - 1)}>
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
        )}

        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Link key={page} href={buildHref(page)}>
              <Button
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                className={page === currentPage ? 'bg-rose-500 text-white hover:bg-rose-600' : ''}
              >
                {page}
              </Button>
            </Link>
          )
        )}

        {currentPage < totalPages ? (
          <Link href={buildHref(currentPage + 1)}>
            <Button variant="outline" size="sm" className="gap-1">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
