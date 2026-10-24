import { describe, expect, it } from 'vitest';

import { isHeaderPathActive } from './header-nav';

describe('header path matching', () => {
  it('marks Home only on the root path', () => {
    expect(isHeaderPathActive('/', '/')).toBe(true);
    expect(isHeaderPathActive('/search', '/')).toBe(false);
    expect(isHeaderPathActive('/library', '/')).toBe(false);
  });

  it('marks nested routes under a section', () => {
    expect(isHeaderPathActive('/search', '/search')).toBe(true);
    expect(isHeaderPathActive('/library', '/library')).toBe(true);
    expect(isHeaderPathActive('/admin/story', '/admin')).toBe(true);
    expect(isHeaderPathActive('/stories/the-lamp-at-dusk', '/library')).toBe(false);
  });
});
