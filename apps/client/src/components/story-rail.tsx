import type { CatalogueStory } from '@/lib/catalogue-types';

import { MediaRail } from './media-rail';
import { StoryCard } from './story-card';

type StoryRailProps = {
  title: string;
  stories: CatalogueStory[];
};

export function StoryRail({ title, stories }: StoryRailProps) {
  return (
    <MediaRail title={title}>
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} variant="rail" />
      ))}
    </MediaRail>
  );
}
