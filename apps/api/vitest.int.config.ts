import { defineConfig } from 'vitest/config';

// Tests d'intégration (make test-db) : les dépôts Postgres contre une base dédiée, migrée avant les tests.
export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['src/testing/database-setup.ts'],
    // Une seule base pour tous les fichiers : ils passent l'un après l'autre.
    fileParallelism: false,
  },
});
