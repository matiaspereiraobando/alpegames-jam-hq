import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jam HQ',
  description: 'Alpe Games jam project admin hub',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0d1117',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-zinc-100">
        <main className="mx-auto min-h-screen max-w-[1600px] p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
