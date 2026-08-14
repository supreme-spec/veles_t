import { db } from '../db';
import { hotels } from '../db/schema';
import { ostrovokClient } from '../lib/ostrovok/client';
import { processHotelImages } from '../lib/media/image-processor';
import { eq } from 'drizzle-orm';

export async function syncHotels() {
  console.log('[SYNC] Starting hotel sync...');

  try {
    const dump = await ostrovokClient.getHotelDump();
    const url = dump.url;

    if (!url) {
      console.log('[SYNC] No dump URL available');
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download dump: ${response.statusText}`);
    }

    const data = await response.json();
    const hotelList = data.hotels || [];

    console.log(`[SYNC] Processing ${hotelList.length} hotels...`);

    for (const hotel of hotelList) {
      try {
        const existing = await db
          .select()
          .from(hotels)
          .where(eq(hotels.ostrovokHid, hotel.id))
          .limit(1);

        const images = hotel.images ? await processHotelImages(hotel.images, hotel.slug) : [];

        const hotelData = {
          ostrovokHid: hotel.id,
          name: hotel.name || '',
          normalizedName: (hotel.name || '').toLowerCase().trim(),
          slug: hotel.slug || String(hotel.id),
          country: hotel.country || null,
          region: hotel.region || null,
          city: hotel.city || null,
          district: hotel.district || null,
          address: hotel.address || 'Адрес не указан',
          latitude: parseFloat(hotel.latitude || '0'),
          longitude: parseFloat(hotel.longitude || '0'),
          stars: parseInt(hotel.star_rating || '0', 10),
          propertyType: hotel.kind || 'Hotel',
          description: hotel.description_struct?.[0]?.paragraphs?.join('\n') || '',
          amenities: hotel.amenities || [],
          contacts: hotel.contacts || {},
          images,
          status: 'ACTIVE' as const,
          source: 'ostrovok',
          lastSyncedAt: new Date(),
          lastSeenAt: new Date(),
        };

        if (existing.length > 0) {
          await db
            .update(hotels)
            .set({
              ...hotelData,
              updatedAt: new Date(),
            })
            .where(eq(hotels.ostrovokHid, hotel.id));
        } else {
          await db.insert(hotels).values(hotelData);
        }

        console.log(`[SYNC] Synced: ${hotel.name}`);
      } catch (error) {
        console.error(`[SYNC] Error syncing hotel ${hotel.id}:`, error);
      }
    }

    console.log('[SYNC] Hotel sync completed');
  } catch (error) {
    console.error('[SYNC] Sync failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  syncHotels();
}
