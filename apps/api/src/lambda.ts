import awsLambdaFastify from '@fastify/aws-lambda';

import { PrismaAdminRepository } from './admin/prisma-repository.js';
import { buildApp } from './app.js';
import { PrismaCatalogueRepository } from './catalogue/prisma-repository.js';
import { createPrismaClient } from './db/prisma.js';
import { PrismaUserLibraryRepository } from './users/prisma-repository.js';

const prisma = createPrismaClient();
const app = await buildApp(process.env, {
  catalogue: new PrismaCatalogueRepository(prisma),
  users: new PrismaUserLibraryRepository(prisma),
  admin: new PrismaAdminRepository(prisma),
  mediaPrisma: prisma,
});
app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

export const handler = awsLambdaFastify(app);
await app.ready();
