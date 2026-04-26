import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Agency Dashboard — L&S',
  description: 'Luka & Samvit financial command center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
