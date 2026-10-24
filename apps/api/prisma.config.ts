import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

config({ path: resolve(import.meta.dirname, '../../.env') });
config({ path: resolve(import.meta.dirname, '.env') });

const localPlaceholderUrl = 'postgresql://daiva:daiva@127.0.0.1:5432/daiva';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? localPlaceholderUrl,
  },
});
