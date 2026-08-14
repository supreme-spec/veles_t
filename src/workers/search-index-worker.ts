import { db } from '@/db';
import { hotels } from '@/db/schema';
import { hotelsIndex } from '@/lib/meilisearch';
import { eq } from 'drizzle-orm';

const BATCH_SIZE = 1000;

export async function syncHotelsToMeilisearch() {
  console.log('[MEILISEARCH] Starting hotel sync...');
  
  await hotelsIndex.updateSettings({
    searchableAttributes: ['name', 'city', 'country', 'address', 'amenities', 'description'],
    filterableAttributes: ['country', 'city', 'stars', 'price', 'rating', 'status'],
    sortableAttributes: ['price', 'rating', 'popularity'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });

  let offset = 0;
  let totalIndexed = 0;

  while (true) {
    const batch = await db
      .select({
        id: hotels.id,
        hid: hotels.ostrovokHid,
        name: hotels.name,
        city: hotels.city,
        country: hotels.country,
        stars: hotels.stars,
        rating: hotels.avgRating,
        price: hotels.minPrice,
        amenities: hotels.amenities,
        status: hotels.status,
      })
      .from(hotels)
      .where(eq(hotels.status, 'ACTIVE'))
      .limit(BATCH_SIZE)
      .offset(offset);

    if (batch.length === 0) break;

    const documents = batch.map(h => ({
      id: h.id,
      hid: h.hid,
      name: h.name,
      city: h.city || '',
      country: h.country || '',
      stars: h.stars || 0,
      rating: h.rating || 0,
      price: h.price || 0,
      amenities: h.amenities || [],
      status: h.status,
    }));

    await hotelsIndex.addDocuments(documents, { primaryKey: 'id' });
    
    offset += batch.length;
    totalIndexed += batch.length;
    console.log(`[MEILISEARCH] Indexed ${totalIndexed} hotels`);
  }

  console.log(`[MEILISEARCH] Sync complete. Total indexed: ${totalIndexed}`);
  return totalIndexed;
}

export async function searchHotels(query: string, filters?: any) {
  const searchOptions: any = {
    limit: 20,
    offset: 0,
  };

  if (filters) {
    if (filters.country) searchOptions.filter = [`country = ${filters.country}`];
    if (filters.city) searchOptions.filter = [`city = ${filters.city}`];
    if (filters.stars) searchOptions.filter = [`stars = ${filters.stars}`];
  }

  return await hotelsIndex.search(query, searchOptions);
}
