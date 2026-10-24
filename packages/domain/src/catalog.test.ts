import { describe, expect, it } from 'vitest';

import { catalogFixtureSchema, storySchema } from './catalog';

describe('catalog schemas', () => {
  it('requires sample disclaimers on stories', () => {
    expect(() =>
      storySchema.parse({
        id: 's1',
        universeId: 'u1',
        slug: 'example',
        title: 'Example',
        synopsis: 'A synopsis',
        language: 'kn',
        status: 'PUBLISHED',
        categorySlugs: ['folklore'],
        tags: ['courage'],
        durationSeconds: 90,
        featured: true,
        sortOrder: 1,
        contentNote: 'General audience sample',
        isSampleContent: false,
        sampleDisclaimer: 'Sample only',
      }),
    ).toThrow();
  });

  it('accepts a minimal valid fixture envelope', () => {
    const parsed = catalogFixtureSchema.parse({
      universe: {
        id: 'u1',
        slug: 'guru-daiva-dutta',
        title: 'Guru Daiva Dutta',
        description: 'Sample universe',
        primaryLanguage: 'kn',
        status: 'PUBLISHED',
        isSampleContent: true,
        sampleDisclaimer: 'Sample only',
      },
      categories: [{ id: 'c1', slug: 'folklore', title: 'Folklore' }],
      stories: [
        {
          id: 's1',
          universeId: 'u1',
          slug: 'example',
          title: 'Example',
          synopsis: 'A synopsis',
          language: 'kn',
          status: 'PUBLISHED',
          categorySlugs: ['folklore'],
          tags: ['courage'],
          durationSeconds: 90,
          featured: true,
          sortOrder: 1,
          contentNote: 'General audience sample',
          isSampleContent: true,
          sampleDisclaimer: 'Sample only',
        },
      ],
      episodes: [
        {
          id: 'e1',
          storyId: 's1',
          slug: 'example-1',
          title: 'Example 1',
          synopsis: 'A synopsis',
          episodeNumber: 1,
          language: 'kn',
          durationSeconds: 90,
          status: 'PUBLISHED',
          captionsAvailable: true,
          isSampleContent: true,
          sampleDisclaimer: 'Sample only',
        },
      ],
    });

    expect(parsed.universe.slug).toBe('guru-daiva-dutta');
  });
});
