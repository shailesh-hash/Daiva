import { ApiClientError } from '@daiva/api-client';
import { afterEach, describe, expect, it } from 'vitest';

import { getCatalogueSource } from './catalogue-source';

describe('fixture catalogue source', () => {
  const previous = process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES;
    } else {
      process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES = previous;
    }
  });

  it('hides draft stories and episodes', async () => {
    process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES = 'true';
    const source = getCatalogueSource();
    const stories = await source.listStories();

    expect(stories.map((story) => story.slug)).not.toContain('unpublished-editorial-draft');
    await expect(source.getStory('unpublished-editorial-draft')).rejects.toMatchObject({
      status: 404,
    });
    await expect(source.getEpisode('ep-draft-01')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('returns published fixture stories for explicit local use', async () => {
    process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES = 'true';
    const source = getCatalogueSource();
    const stories = await source.searchStories('lamp');
    expect(stories.some((story) => story.slug === 'the-lamp-at-dusk')).toBe(true);
  });
});
