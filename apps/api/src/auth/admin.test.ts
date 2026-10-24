import { describe, expect, it } from 'vitest';

import { isAdminSubject, isLocalAdminReadyEnabled, parseAdminSubjects } from './admin.js';

describe('admin subject allowlist', () => {
  it('defaults to dev:admin only in local test mode', () => {
    expect(parseAdminSubjects({ NODE_ENV: 'test', AUTH_MODE: 'test' })).toEqual(
      new Set(['dev:admin']),
    );
    expect(isAdminSubject('dev:admin', { NODE_ENV: 'test' })).toBe(true);
    expect(isAdminSubject('user-a', { NODE_ENV: 'test' })).toBe(false);
  });

  it('uses the configured allowlist and never defaults in production', () => {
    expect(
      parseAdminSubjects({
        NODE_ENV: 'production',
        AUTH_MODE: 'cognito',
        ADMIN_SUBJECTS: 'editor-1, editor-2',
      }),
    ).toEqual(new Set(['editor-1', 'editor-2']));
    expect(parseAdminSubjects({ NODE_ENV: 'production', AUTH_MODE: 'cognito' })).toEqual(new Set());
    expect(isLocalAdminReadyEnabled({ NODE_ENV: 'production', AUTH_MODE: 'cognito' })).toBe(false);
  });
});
