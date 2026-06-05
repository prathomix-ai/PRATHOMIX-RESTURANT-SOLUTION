/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prathomix Restaurant — Elegant Dining & Reservations',
  description: 'A floating glassmorphism restaurant experience with premium dining, curated menus, and seamless reservations.',
};

export const viewport = {
  themeColor: '#C5A880',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0A0A0A] text-[#EAE6DF] antialiased" suppressHydrationWarning={true}>
        <div className="min-h-screen relative isolate">
          {children}
        </div>
      </body>
    </html>
  );
}
