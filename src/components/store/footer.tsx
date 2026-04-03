import Link from 'next/link';
import { generateWhatsAppLink } from '@/lib/utils/whatsapp';

export function Footer() {
  const whatsappLink = generateWhatsAppLink('¡Hola! Tengo una consulta sobre Fun4Me Store.');

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
              Fun4Me
            </span>
            <p className="mt-3 text-sm text-muted-foreground">
              Tu espacio seguro para explorar productos de bienestar íntimo con total discreción en Paraguay.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Tienda</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground">Inicio</Link></li>
              <li><Link href="/#categorias" className="hover:text-foreground">Categorías</Link></li>
              <li><Link href="/#kinks" className="hover:text-foreground">Por Kink</Link></li>
              <li><Link href="/#ofertas" className="hover:text-foreground">Ofertas</Link></li>
            </ul>
          </div>

          {/* Ayuda */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Ayuda</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="hover:text-foreground cursor-default">Envíos y Entregas</span></li>
              <li><span className="hover:text-foreground cursor-default">Política de Devolución</span></li>
              <li><span className="hover:text-foreground cursor-default">Preguntas Frecuentes</span></li>
              <li><span className="hover:text-foreground cursor-default">Privacidad</span></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Contacto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span>💬</span>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                  +595 976 569 739
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:contacto@fun4me.com" className="hover:text-foreground">
                  contacto@fun4me.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>📍</span>
                <span>Asunción, Paraguay</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Fun4Me Store. Todos los derechos reservados.</p>
          <p className="mt-1">Asunción, Paraguay 🇵🇾</p>
        </div>
      </div>
    </footer>
  );
}
