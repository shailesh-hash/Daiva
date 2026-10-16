import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('./src/lib', import.meta.url)),
  test: {
    include: ['**/*.test.ts'],
    environment: 'node',
  },
});
