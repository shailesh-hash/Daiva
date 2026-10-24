import { resolveAuthMode } from './verifier.js';

const DEFAULT_TEST_ADMIN = 'dev:admin';

export function parseAdminSubjects(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = new Set(
    (env.ADMIN_SUBJECTS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
  if (configured.size > 0) {
    return configured;
  }
  if (resolveAuthMode(env) === 'test' && env.NODE_ENV !== 'production') {
    return new Set([DEFAULT_TEST_ADMIN]);
  }
  return new Set();
}

export function isAdminSubject(subject: string, env: NodeJS.ProcessEnv = process.env): boolean {
  return parseAdminSubjects(env).has(subject);
}

export function isLocalAdminReadyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveAuthMode(env) === 'test' && env.NODE_ENV !== 'production';
}
