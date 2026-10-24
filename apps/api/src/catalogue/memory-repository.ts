import {
  paginateItems,
  type EpisodeListQuery,
  type PublicEpisode,
  type PublicStory,
  type PublicUniverse,
  type SearchHit,
  type SearchQuery,
  type StoryListQuery,
  type UniverseListQuery,
} from '@daiva/domain';

import { groupPublicCatalogue } from './mapper.js';
import type { CatalogueEpisodeRecord, CataloguePage, CatalogueRepository } from './types.js';

function padSortKey(value: number): string {
  return String(value).padStart(8, '0');
}

function matchesQuery(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export class MemoryCatalogueRepository implements CatalogueRepository {
  constructor(private readonly rows: CatalogueEpisodeRecord[]) {}

  async listUniverses(query: UniverseListQuery): Promise<CataloguePage<PublicUniverse>> {
    const universes = groupPublicCatalogue(this.rows).universes.filter((universe) =>
      query.language ? universe.primaryLanguage === query.language : true,
    );
    const page = paginateItems(universes, query.limit, query.cursor, 'universe', (item) => ({
      k: `${item.title}:${item.id}`,
      i: item.id,
    }));
    return { data: page.data, page: { nextCursor: page.nextCursor } };
  }

  async getUniverseBySlug(slug: string): Promise<PublicUniverse | null> {
    return (
      groupPublicCatalogue(this.rows).universes.find((universe) => universe.slug === slug) ?? null
    );
  }

  async listStories(query: StoryListQuery): Promise<CataloguePage<PublicStory>> {
    const stories = this.visibleStories().filter((story) => {
      if (query.universe && story.universeSlug !== query.universe) {
        return false;
      }
      if (query.language && story.language !== query.language) {
        return false;
      }
      if (query.category && !story.categorySlugs.includes(query.category)) {
        return false;
      }
      return true;
    });
    const page = paginateItems(stories, query.limit, query.cursor, 'story', (item) => ({
      k: `${padSortKey(item.sortOrder)}:${item.id}`,
      i: item.id,
    }));
    return { data: page.data, page: { nextCursor: page.nextCursor } };
  }

  async getStoryBySlug(slug: string): Promise<PublicStory | null> {
    return this.visibleStories().find((story) => story.slug === slug) ?? null;
  }

  async getPublicStoryById(storyId: string): Promise<PublicStory | null> {
    return this.visibleStories().find((story) => story.id === storyId) ?? null;
  }

  async listEpisodes(
    storySlug: string,
    query: EpisodeListQuery,
  ): Promise<CataloguePage<PublicEpisode> | 'story_not_found'> {
    if (!(await this.getStoryBySlug(storySlug))) {
      return 'story_not_found';
    }
    const episodes = groupPublicCatalogue(this.rows).episodes.filter(
      (episode) => episode.storySlug === storySlug,
    );
    const page = paginateItems(episodes, query.limit, query.cursor, 'episode', (item) => ({
      k: `${padSortKey(item.episodeNumber)}:${item.id}`,
      i: item.id,
    }));
    return { data: page.data, page: { nextCursor: page.nextCursor } };
  }

  async getEpisodeById(episodeId: string): Promise<PublicEpisode | null> {
    return (
      groupPublicCatalogue(this.rows).episodes.find((episode) => episode.id === episodeId) ?? null
    );
  }

  async search(query: SearchQuery): Promise<CataloguePage<SearchHit>> {
    const { stories, episodes } = groupPublicCatalogue(this.rows);
    const needle = query.q.trim();
    const hits: SearchHit[] = [];

    for (const story of stories) {
      if (query.language && story.language !== query.language) {
        continue;
      }
      const haystack = [
        story.title,
        story.synopsis ?? '',
        ...story.tags,
        ...story.categorySlugs,
      ].join(' ');
      if (matchesQuery(haystack, needle)) {
        hits.push({ type: 'story', story });
      }
    }

    for (const episode of episodes) {
      if (query.language && episode.language !== query.language) {
        continue;
      }
      const haystack = [episode.title, episode.synopsis ?? ''].join(' ');
      if (matchesQuery(haystack, needle)) {
        hits.push({ type: 'episode', episode });
      }
    }

    hits.sort((left, right) => {
      const leftTitle = left.type === 'story' ? left.story.title : left.episode.title;
      const rightTitle = right.type === 'story' ? right.story.title : right.episode.title;
      const titleOrder = leftTitle.localeCompare(rightTitle);
      if (titleOrder !== 0) {
        return titleOrder;
      }
      const leftId = left.type === 'story' ? left.story.id : left.episode.id;
      const rightId = right.type === 'story' ? right.story.id : right.episode.id;
      return leftId.localeCompare(rightId);
    });

    const page = paginateItems(hits, query.limit, query.cursor, 'search', (item) => {
      const id = item.type === 'story' ? item.story.id : item.episode.id;
      const title = item.type === 'story' ? item.story.title : item.episode.title;
      return { k: `${title}:${item.type}:${id}`, i: id };
    });
    return { data: page.data, page: { nextCursor: page.nextCursor } };
  }

  private visibleStories(): PublicStory[] {
    return groupPublicCatalogue(this.rows).stories;
  }
}
