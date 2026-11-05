import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Horloge réglable, la même que celle de l'API (FAKE_NOW, voir .env.example) : l'heure de départ et l'instant réel
// où l'horloge la vaut, fixés au démarrage du serveur de développement ou au build.
const fakeNow = process.env['FAKE_NOW']?.trim() ?? '';
if (fakeNow && !/[T ]\d{2}:\d{2}.*(Z|[+-]\d{2}:\d{2})$/.test(fakeNow)) {
  throw new Error(`FAKE_NOW must be an ISO 8601 date-time with a time zone, got "${fakeNow}"`);
}
const fakeNowSince = fakeNow ? (process.env['FAKE_NOW_SINCE'] ?? String(Math.floor(Date.now() / 1000))) : '';

const config: NextConfig = {
  env: {
    // Adresse de l'API, appelée directement par le navigateur : fixée au build.
    NEXT_PUBLIC_API_URL: process.env['API_URL'] ?? 'http://localhost:4030',
    NEXT_PUBLIC_FAKE_NOW: fakeNow,
    NEXT_PUBLIC_FAKE_NOW_SINCE: fakeNowSince,
  },
  // Image de production (apps/web/Dockerfile, étape run) : un serveur autonome, dépendances du monorepo comprises.
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  poweredByHeader: false,
};

export default config;
