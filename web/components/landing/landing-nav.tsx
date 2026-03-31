'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { VeticLogo } from './vetic-logo'
import { getWhatsAppUrl, landingMessages } from '@/lib/whatsapp'

const navLinks = [
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/precios', label: 'Precios' },
  { href: '/red', label: 'Red' },
  { href: '/demo', label: 'Demo' },
  { href: '/ambassador', label: 'Embajadores' },
  { href: '/faq', label: 'FAQ' },
  { href: '/nosotros', label: 'Nosotros' },
]

export function LandingNav(): React.ReactElement {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--landing-border)] bg-[var(--landing-bg-white)]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--landing-primary-lighter)] transition-all group-hover:scale-105 group-hover:bg-[var(--landing-primary-light)]">
              <VeticLogo size={24} />
            </div>
            <span className="text-xl font-bold text-[var(--landing-text-primary)]">Vetic</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[var(--landing-text-secondary)] transition-colors hover:text-[var(--landing-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Button */}
          <a
            href={getWhatsAppUrl(landingMessages.contact())}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full bg-[var(--landing-primary)] px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--landing-primary-hover)] md:inline-flex"
          >
            Contactar
          </a>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--landing-text-secondary)] hover:bg-[var(--landing-bg-muted)] md:hidden"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--landing-border-light)] py-4 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-[var(--landing-text-secondary)] transition-colors hover:text-[var(--landing-primary)]"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={getWhatsAppUrl(landingMessages.contact())}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-primary)] px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-[var(--landing-primary-hover)]"
              >
                Contactar
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
