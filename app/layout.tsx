import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jam HQ',
  description: 'Alpe Games jam project admin hub',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#050712',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-zinc-100">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-grid bg-[size:42px_42px] opacity-25" />
        <main className="mx-auto min-h-screen max-w-[1480px] px-4 py-6 md:px-8 md:py-10">{children}</main>
      </body>
    </html>
  );
}
