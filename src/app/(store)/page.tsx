import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WHATSAPP_NUMBER, STORE_NAME } from '@/lib/constants';
import { generateWhatsAppLink } from '@/lib/utils/whatsapp';

export default function HomePage() {
  const whatsappLink = generateWhatsAppLink(
    '¡Hola! Me interesa saber más sobre Fun4Me Store.',
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            🎉 {STORE_NAME}
          </h1>
          <p className="text-xl text-muted-foreground">Próximamente</p>
        </div>

        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Estamos preparando algo increíble</CardTitle>
            <CardDescription>
              Tu nueva tienda favorita en Paraguay está en camino. ¡Pronto
              podrás descubrir productos divertidos para toda la familia!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Querés ser de los primeros en enterarte? Escribinos por
              WhatsApp:
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full" size="lg">
                💬 Contactanos por WhatsApp
              </Button>
            </a>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          📍 Asunción, Paraguay | 📱{' '}
          <a
            href={`tel:${WHATSAPP_NUMBER}`}
            className="underline hover:text-foreground"
          >
            {WHATSAPP_NUMBER}
          </a>
        </p>
      </div>
    </div>
  );
}
