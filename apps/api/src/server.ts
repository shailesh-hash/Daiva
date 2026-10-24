import { PrismaAdminRepository } from './admin/prisma-repository.js';
import { buildApp } from './app.js';
import { PrismaCatalogueRepository } from './catalogue/prisma-repository.js';
import { createPrismaClient } from './db/prisma.js';
import { PrismaUserLibraryRepository } from './users/prisma-repository.js';

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number(process.env.API_PORT ?? 3000);

const prisma = createPrismaClient();
const app = await buildApp(process.env, {
  catalogue: new PrismaCatalogueRepository(prisma),
  users: new PrismaUserLibraryRepository(prisma),
  admin: new PrismaAdminRepository(prisma),
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
