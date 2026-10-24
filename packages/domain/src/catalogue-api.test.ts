import { describe, expect, it } from 'vitest';

import {
  compareCursor,
  decodeCursor,
  encodeCursor,
  paginateItems,
  searchQuerySchema,
  storyListQuerySchema,
  universeListQuerySchema,
} from './catalogue-api';

describe('catalogue query schemas', () => {
  it('defaults list limits and accepts optional filters', () => {
    expect(universeListQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(
      storyListQuerySchema.parse({
        universe: 'guru-daiva-dutta',
        language: 'kn',
        category: 'devotional',
        limit: '2',
      }),
    ).toEqual({
      universe: 'guru-daiva-dutta',
      language: 'kn',
      category: 'devotional',
      limit: 2,
    });
  });

  it('rejects invalid list and search inputs', () => {
    expect(() => universeListQuerySchema.parse({ limit: '0' })).toThrow();
    expect(() => universeListQuerySchema.parse({ limit: '99' })).toThrow();
    expect(() => storyListQuerySchema.parse({ universe: 'Not A Slug' })).toThrow();
    expect(() => searchQuerySchema.parse({ q: '   ' })).toThrow();
    expect(() => searchQuerySchema.parse({})).toThrow();
  });
});

describe('cursors', () => {
  it('round-trips a payload and rejects the wrong collection type', () => {
    const encoded = encodeCursor({ t: 'story', k: '0002', i: 'id-2' });
    expect(decodeCursor(encoded, 'story')).toEqual({ t: 'story', k: '0002', i: 'id-2' });
    expect(() => decodeCursor(encoded, 'universe')).toThrow('Invalid cursor');
    expect(() => decodeCursor('%%%', 'story')).toThrow('Invalid cursor');
  });

  it('paginates after the cursor without skipping the type filter', () => {
    const items = [
      { id: 'a', key: '1' },
      { id: 'b', key: '2' },
      { id: 'c', key: '3' },
    ];
    const first = paginateItems(items, 2, undefined, 'story', (item) => ({
      k: item.key,
      i: item.id,
    }));
    expect(first.data.map((item) => item.id)).toEqual(['a', 'b']);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = paginateItems(items, 2, first.nextCursor ?? undefined, 'story', (item) => ({
      k: item.key,
      i: item.id,
    }));
    expect(second.data.map((item) => item.id)).toEqual(['c']);
    expect(second.nextCursor).toBeNull();
  });

  it('orders by sort key then id', () => {
    expect(compareCursor('2', 'b', { t: 'story', k: '1', i: 'z' })).toBe(1);
    expect(compareCursor('1', 'a', { t: 'story', k: '1', i: 'b' })).toBe(-1);
    expect(compareCursor('1', 'b', { t: 'story', k: '1', i: 'b' })).toBe(0);
  });
});
