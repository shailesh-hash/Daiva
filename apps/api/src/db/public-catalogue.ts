import { evaluatePublication, type PublicationInput } from '@daiva/domain';

export type CatalogueEpisodeRecord = PublicationInput;

export function evaluateCatalogueEpisode(record: CatalogueEpisodeRecord) {
  return evaluatePublication(record);
}

export function isPublicCatalogueEpisode(record: CatalogueEpisodeRecord): boolean {
  return evaluatePublication(record).isPublicCatalogue;
}

export function filterPublicCatalogueEpisodes<T extends CatalogueEpisodeRecord>(rows: T[]): T[] {
  return rows.filter(isPublicCatalogueEpisode);
}
