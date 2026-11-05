import { configDefaults, defineConfig } from 'vitest/config';

// Tests unitaires (make test) : sans base de données ; les *.int.test.ts passent par vitest.int.config.ts.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, '**/*.int.test.ts'] },
});
