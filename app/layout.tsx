/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prathomix Restaurant — Elegant Dining & Reservations',
  description: 'A floating glassmorphism restaurant experience with premium dining, curated menus, and seamless reservations.',
};

export const viewport = {
  themeColor: '#D97706',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FAF9F6] text-stone-900 antialiased" suppressHydrationWarning={true}>
        <div className="min-h-screen relative isolate">
          {children}
        </div>
      </body>
    </html>
  );
}
