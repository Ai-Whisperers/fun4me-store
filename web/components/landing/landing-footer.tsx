import Link from 'next/link'
import { Phone, MapPin, MessageCircle } from 'lucide-react'
import { VeticLogo } from './vetic-logo'
import { brandConfig } from '@/lib/branding/config'
import { getWhatsAppUrl, getWhatsAppDisplayNumber } from '@/lib/whatsapp'

export function LandingFooter(): React.ReactElement {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-[var(--landing-border)] bg-[var(--landing-bg-white)] py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--landing-primary-lighter)]">
              <VeticLogo size={20} />
            </div>
            <span className="text-xl font-bold text-[var(--landing-text-primary)]">Vetic</span>
          </Link>

          {/* Contact Info */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[var(--landing-text-muted)]">
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-[var(--landing-primary)]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href={`tel:+${brandConfig.whatsapp.number}`}
              className="flex items-center gap-2 transition-colors hover:text-[var(--landing-primary)]"
            >
              <Phone className="h-4 w-4" />
              {getWhatsAppDisplayNumber()}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Asunción, Paraguay
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[var(--landing-text-muted)]">
            <Link href="/funcionalidades" className="transition-colors hover:text-[var(--landing-primary)]">
              Funcionalidades
            </Link>
            <Link href="/precios" className="transition-colors hover:text-[var(--landing-primary)]">
              Precios
            </Link>
            <Link href="/red" className="transition-colors hover:text-[var(--landing-primary)]">
              Red de Clínicas
            </Link>
            <Link href="/demo" className="transition-colors hover:text-[var(--landing-primary)]">
              Demo
            </Link>
            <Link href="/faq" className="transition-colors hover:text-[var(--landing-primary)]">
              FAQ
            </Link>
            <Link href="/nosotros" className="transition-colors hover:text-[var(--landing-primary)]">
              Nosotros
            </Link>
          </div>

          {/* Bottom */}
          <div className="flex flex-col items-center gap-4 border-t border-[var(--landing-border-light)] pt-8 text-sm text-[var(--landing-text-light)]">
            <p>© {currentYear} Vetic. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ en Paraguay</p>
            <div className="flex gap-6 text-xs">
              <Link href="/terrapet/privacy" className="transition-colors hover:text-[var(--landing-text-secondary)]">
                Privacidad
              </Link>
              <Link href="/terrapet/terms" className="transition-colors hover:text-[var(--landing-text-secondary)]">
                Términos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
