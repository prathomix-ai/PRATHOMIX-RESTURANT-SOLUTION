import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prathomix Restaurant — Next-Gen Dining',
  description: 'AI-powered restaurant with voice ordering, macro tracking, and instant booking.',
};

export const viewport = {
  themeColor: '#00ffe7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-dark-900 text-slate-100 antialiased">
        <div className="min-h-screen grid-bg relative">
          {children}
        </div>
      </body>
    </html>
  );
}
