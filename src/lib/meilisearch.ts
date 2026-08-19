import { Meilisearch } from 'meilisearch';

export const meilisearch = new Meilisearch({
  host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  ...(process.env.MEILI_MASTER_KEY ? { apiKey: process.env.MEILI_MASTER_KEY } : {}),
});

export const hotelsIndex = meilisearch.index('hotels');
