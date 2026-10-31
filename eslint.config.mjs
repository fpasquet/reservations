// ESLint de tout le dépôt (make lint), sans avertissement toléré : typescript-eslint avec les types partout, les règles
// de Next.js (React, hooks, accessibilité) pour apps/web, et Prettier, qui garde la main sur la mise en forme.
import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const WEB = 'apps/web/**';

export default defineConfig(
  globalIgnores(['**/node_modules/', '**/dist/', '**/.next/', '**/.turbo/', '**/next-env.d.ts']),
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  // Next.js d'abord, sans son bloc typescript-eslint : celui du dépôt, avec les types, vient après.
  ...nextCoreWebVitals
    .filter((block) => block.name !== 'next/typescript')
    .map((block) => ({ ...block, files: block.files?.map((pattern) => `apps/web/${pattern}`) ?? [WEB] })),
  { settings: { next: { rootDir: 'apps/web/' } } },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: [`${WEB}/*.tsx`, `${WEB}/*.ts`], languageOptions: { globals: { ...globals.browser } } },
  // Fichiers de configuration en JavaScript : hors de tout projet TypeScript.
  { files: ['**/*.{js,mjs,cjs}'], ...tseslint.configs.disableTypeChecked },
  prettier,
);
