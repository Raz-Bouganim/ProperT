import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

import { AuthProvider } from '@/context/AuthContext';
import { GlobalToaster } from '@/components/ui/GlobalToaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'ProperT',
  description: 'Find your next property.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(inter.variable, manrope.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Internal:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn(inter.className, "bg-background text-foreground antialiased")}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">{children}</main>
          </div>
          <GlobalToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
