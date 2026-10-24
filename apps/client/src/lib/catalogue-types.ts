export type CatalogueUniverse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  primaryLanguage: string;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
};

export type CatalogueStory = {
  id: string;
  universeId: string;
  universeSlug: string;
  slug: string;
  title: string;
  synopsis: string;
  language: string;
  categorySlugs: string[];
  tags: string[];
  durationSeconds: number;
  featured: boolean;
  sortOrder: number;
  contentNote: string;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
  publicEpisodeCount: number;
};

export type CatalogueEpisode = {
  id: string;
  storyId: string;
  storySlug: string;
  universeSlug: string;
  slug: string;
  title: string;
  synopsis: string;
  episodeNumber: number;
  language: string;
  durationSeconds: number;
  captionsAvailable: boolean;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
};
