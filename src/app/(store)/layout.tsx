export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Fun4Me Store</h1>
          <nav className="flex items-center gap-4">
            {/* Navigation will be added here */}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Fun4Me Store. Todos los derechos reservados.</p>
          <p className="mt-1">Asunción, Paraguay 🇵🇾</p>
        </div>
      </footer>
    </div>
  );
}
