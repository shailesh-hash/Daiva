export const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
] as const;

export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function getCorsAllowlist(env: NodeJS.ProcessEnv = process.env): readonly string[] {
  const extras = parseCorsOrigins(env.CORS_ORIGINS);

  if (env.NODE_ENV === 'production') {
    return extras;
  }

  return [...new Set([...DEFAULT_DEV_CORS_ORIGINS, ...extras])];
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowed: readonly string[],
): boolean {
  if (!origin) {
    return true;
  }

  return allowed.includes(origin);
}
