import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { db } from '@/db';
import { hotels } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getCached, setCached } from '@/lib/redis';
import { slugify } from '@/lib/slugify';

export const runtime = 'nodejs';

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'москва': { lat: 55.7558, lon: 37.6173 },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351 },
  'сочи': { lat: 43.6028, lon: 39.7342 },
  'казань': { lat: 55.7887, lon: 49.1221 },
  'дубай': { lat: 25.2048, lon: 55.2708 },
  'стамбул': { lat: 41.0082, lon: 28.9784 },
  'бангкок': { lat: 13.7563, lon: 100.5018 },
};

async function upsertHotel(h: any) {
  if (!h?.hid) return null;
  const normalizedName = String(h.name || '').toLowerCase().trim();
  const slug = `hotel-${h.hid}`;
  const seoSlug = slugify(h.name || `hotel-${h.hid}`);
  const status = 'ACTIVE' as const;
  const payload = {
    ostrovokHid: h.hid,
    ostrovokId: String(h.hid),
    name: h.name || `Отель ${h.hid}`,
    normalizedName: normalizedName || `hotel ${h.hid}`,
    slug,
    seoSlug,
    country: h.country?.name || 'Неизвестно',
    region: h.region?.name || null,
    city: h.city?.name || 'Неизвестно',
    district: h.district?.name || null,
    address: h.address || null,
    latitude: Number(h.latitude || 0),
    longitude: Number(h.longitude || 0),
    stars: Number(h.stars || 0),
    propertyType: h.kind || 'Hotel',
    description: (h.description_struct?.[0]?.paragraphs || []).join('\n') || null,
    amenities: Array.isArray(h.amenities) ? h.amenities : [],
    contacts: h.contacts || {},
    images: Array.isArray(h.images) ? h.images : [],
    cancellationPolicies: h.metapolicy_struct?.cancellation_penalties || null,
    roomsData: h.metapolicy_struct?.meal ? { mealTypes: h.metapolicy_struct.meal, taxes: h.metapolicy_struct.tax_data?.taxes || [] } : null,
    status,
    source: 'ostrovok',
    lastSyncedAt: new Date(),
    lastSeenAt: new Date(),
  };

  const existing = await db.select().from(hotels).where(eq(hotels.ostrovokHid, h.hid)).limit(1);
  if (existing.length > 0) {
    await db.update(hotels).set({ ...payload, updatedAt: new Date() }).where(eq(hotels.ostrovokHid, h.hid));
    return { ...existing[0], ...payload };
  }
  const created = await db.insert(hotels).values(payload).returning();
  return created[0];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  const adults = Number(searchParams.get('adults') || '2');
  const childrenParam = searchParams.get('children');
  let children: number[] = [];
  if (childrenParam) {
    try {
      const parsed = JSON.parse(childrenParam);
      if (Array.isArray(parsed)) {
        children = parsed.filter((age: any) => typeof age === 'number' && age >= 0 && age <= 17);
      }
    } catch {
      children = [];
    }
  }
  const residency = searchParams.get('residency') || 'RU';

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const lowerQuery = query.toLowerCase().trim();
    const cacheKey = `search:${Buffer.from(`${lowerQuery}:${checkin}:${checkout}:${adults}:${children}:${residency}`).toString('base64')}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    if (checkin && checkout) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const finalCheckin = checkin || tomorrow.toISOString().split('T')[0]!;
      const finalCheckout = checkout || dayAfter.toISOString().split('T')[0]!;

      const coords = CITY_COORDS[lowerQuery];

      try {
        const searchResult = coords
          ? await ostrovokClient.searchByGeo({
              lat: coords.lat,
              lon: coords.lon,
              radius: 20,
              checkin: finalCheckin,
              checkout: finalCheckout,
              guests: [{ adults, children }],
              residency,
            })
          : await ostrovokClient.searchByGeo({
              lat: 55.7558,
              lon: 37.6173,
              radius: 50,
              checkin: finalCheckin,
              checkout: finalCheckout,
              guests: [{ adults, children }],
              residency,
            });

        if (searchResult.status === 'ok' && Array.isArray(searchResult.data?.result?.hotels)) {
          const saved = await Promise.allSettled(
            searchResult.data.result.hotels.slice(0, 20).map(upsertHotel)
          );

          const results = saved
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map(r => r.value)
            .filter(Boolean);

          const payload = { results, source: 'ostrovok' };
          await setCached(cacheKey, payload, 900);
          return NextResponse.json(payload);
        }
      } catch (error) {
        console.error('[SEARCH OSTROVOK ERROR]:', error);
      }
    }

    const localResults = await db
      .select({
        id: hotels.id,
        ostrovokHid: hotels.ostrovokHid,
        name: hotels.name,
        slug: hotels.slug,
        city: hotels.city,
        country: hotels.country,
        address: hotels.address,
        stars: hotels.stars,
        images: hotels.images,
        amenities: hotels.amenities,
        description: hotels.description,
      })
      .from(hotels)
      .where(sql`${hotels.name} ILIKE ${`%${query}%`} OR ${hotels.city} ILIKE ${`%${query}%`} OR ${hotels.country} ILIKE ${`%${query}%`}`)
      .limit(20);

    const localPayload = { results: localResults, source: 'local' };
    await setCached(cacheKey, localPayload, 900);
    return NextResponse.json(localPayload);
  } catch (error: any) {
    console.error('[SEARCH ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
