import { describe, expect, it } from 'vitest';

import { catalogFixture } from '../fixtures/catalog';

import {
  getEpisodeById,
  getStoryBySlug,
  listFeaturedStories,
  listPublishedStories,
  listStaticEpisodeParams,
  listStaticStoryParams,
  searchCatalog,
} from './catalog';

describe('catalog', () => {
  it('exposes only published stories in the public catalogue', () => {
    const slugs = listPublishedStories().map((story) => story.slug);

    expect(slugs).not.toContain('unpublished-editorial-draft');
    expect(catalogFixture.stories.some((story) => story.status === 'DRAFT')).toBe(true);
  });

  it('lists featured published stories', () => {
    const featured = listFeaturedStories();

    expect(featured.every((story) => story.featured && story.status === 'PUBLISHED')).toBe(true);
    expect(featured.some((story) => story.slug === 'the-lamp-at-dusk')).toBe(true);
  });

  it('finds stories by title, tag, language, and category', () => {
    expect(searchCatalog({ query: 'lamp' }).map((story) => story.slug)).toContain(
      'the-lamp-at-dusk',
    );
    expect(searchCatalog({ query: 'courage' }).map((story) => story.slug)).toContain(
      'the-river-crossing',
    );
    expect(searchCatalog({ query: 'en' }).map((story) => story.slug)).toContain(
      'the-drum-of-the-grove',
    );
    expect(
      searchCatalog({ category: 'devotional' }).every((story) =>
        story.categorySlugs.includes('devotional'),
      ),
    ).toBe(true);
  });

  it('does not return draft episodes or stories by public id', () => {
    expect(getStoryBySlug('unpublished-editorial-draft')).toBeUndefined();
    expect(getEpisodeById('ep-draft-01')).toBeUndefined();
  });

  it('marks invented titles as sample content', () => {
    expect(
      catalogFixture.stories.every(
        (story) => story.isSampleContent && story.title.includes('(sample)'),
      ),
    ).toBe(true);
    expect(
      catalogFixture.episodes.every(
        (episode) => episode.isSampleContent && episode.title.includes('(sample)'),
      ),
    ).toBe(true);
  });

  it('exposes only published slugs and episode ids for static web routes', () => {
    expect(listStaticStoryParams().map((item) => item.slug)).not.toContain(
      'unpublished-editorial-draft',
    );
    expect(listStaticEpisodeParams().map((item) => item.id)).not.toContain('ep-draft-01');
  });
});
