import { AnnouncementBar } from '@/components/store/announcement-bar';
import { Header } from '@/components/store/header';
import { Footer } from '@/components/store/footer';
import { WhatsAppFloat } from '@/components/store/whatsapp-float';

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
