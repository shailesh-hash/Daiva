import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

export const LOCAL_PLACEHOLDER_DATABASE_URL = 'postgresql://daiva:daiva@127.0.0.1:5432/daiva';

export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.DATABASE_URL ?? LOCAL_PLACEHOLDER_DATABASE_URL;
}

export function createPrismaClient(env: NodeJS.ProcessEnv = process.env): PrismaClient {
  const adapter = new PrismaPg({ connectionString: getDatabaseUrl(env) });
  return new PrismaClient({ adapter });
}
