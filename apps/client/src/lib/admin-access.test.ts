import { describe, expect, it } from 'vitest';

import { canSeeAdminUi } from './admin-access';

describe('admin UI visibility', () => {
  it('treats a missing or false isAdmin flag as a viewer', () => {
    expect(canSeeAdminUi(null)).toBe(false);
    expect(canSeeAdminUi({ isAdmin: false })).toBe(false);
    expect(canSeeAdminUi({ isAdmin: true })).toBe(true);
  });
});
