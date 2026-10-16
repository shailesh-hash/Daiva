import awsLambdaFastify from '@fastify/aws-lambda';

import { buildApp } from './app.js';

const app = await buildApp();
export const handler = awsLambdaFastify(app);
await app.ready();
