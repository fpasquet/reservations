import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/app-providers';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'La Verrière · Réservations', template: '%s · La Verrière' },
  description: 'Réservez les salles de réunion de La Verrière, espace de coworking.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a
          href="#main"
          className="focus-ring sr-only rounded-control bg-surface px-4 py-2 font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Aller au contenu
        </a>
        <AppProviders>
          <SiteHeader />
          <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
