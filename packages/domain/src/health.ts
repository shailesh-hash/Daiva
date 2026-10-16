import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('daiva-api'),
  requestId: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
