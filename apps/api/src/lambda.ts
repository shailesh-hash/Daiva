import awsLambdaFastify from '@fastify/aws-lambda';

import { buildApp } from './app.js';
import { PrismaCatalogueRepository } from './catalogue/prisma-repository.js';
import { createPrismaClient } from './db/prisma.js';

const prisma = createPrismaClient();
const app = await buildApp(process.env, {
  catalogue: new PrismaCatalogueRepository(prisma),
});
app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

export const handler = awsLambdaFastify(app);
await app.ready();
