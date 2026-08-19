import { NextResponse } from 'next/server';
import { db } from '@/db';
import { hotels } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY || '';

const POPULAR_CITIES = [
  { city: 'Москва', country: 'Россия', slug: 'moscow' },
  { city: 'Санкт-Петербург', country: 'Россия', slug: 'saint-petersburg' },
  { city: 'Сочи', country: 'Россия', slug: 'sochi' },
  { city: 'Казань', country: 'Россия', slug: 'kazan' },
  { city: 'Калининград', country: 'Россия', slug: 'kaliningrad' },
  { city: 'Дубай', country: 'ОАЭ', slug: 'dubai' },
  { city: 'Стамбул', country: 'Турция', slug: 'istanbul' },
  { city: 'Анталья', country: 'Турция', slug: 'antalya' },
  { city: 'Бангкок', country: 'Таиланд', slug: 'bangkok' },
  { city: 'Пхукет', country: 'Таиланд', slug: 'phuket' },
  { city: 'Шарм-эль-Шейх', country: 'Египет', slug: 'sharm-el-sheikh' },
  { city: 'Хургада', country: 'Египет', slug: 'hurghada' },
  { city: 'Бали', country: 'Индонезия', slug: 'bali' },
  { city: 'Париж', country: 'Франция', slug: 'paris' },
  { city: 'Рим', country: 'Италия', slug: 'rome' },
  { city: 'Барселона', country: 'Испания', slug: 'barcelona' },
];

async function getMapTilerSuggestions(query: string, limit: number) {
  if (!MAPTILER_API_KEY || query.length < 2) return [];
  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_API_KEY}&language=ru&limit=${limit}`;
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.features || [])
      .filter((f: any) => f.place_type && f.place_type.includes('place') || f.place_type.includes('locality'))
      .map((f: any) => {
        const country = f.context?.find((c: any) => c.id.startsWith('country'))?.text || '';
        const city = f.text || '';
        return {
          text: country ? `${city}, ${country}` : city,
          city,
          country,
          lat: f.center?.[1],
          lon: f.center?.[0],
          type: 'city' as const,
          source: 'maptiler' as const,
        };
      });
  } catch (error) {
    console.error('[SUGGESTIONS MAPTILER ERROR]:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();
    const limit = Math.min(15, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    if (!query) {
      return NextResponse.json({
        suggestions: POPULAR_CITIES.slice(0, limit).map((c) => ({
          text: `${c.city}, ${c.country}`,
          city: c.city,
          country: c.country,
          type: 'city' as const,
        })),
        query: '',
        total: POPULAR_CITIES.length,
      });
    }

    const lowerQuery = query.toLowerCase();

    const matchedPopular = POPULAR_CITIES
      .filter((c) => c.city.toLowerCase().includes(lowerQuery) || c.country.toLowerCase().includes(lowerQuery))
      .map((c) => ({
        text: `${c.city}, ${c.country}`,
        city: c.city,
        country: c.country,
        type: 'city' as const,
        source: 'popular' as const,
      }));

    let dbCities: any[] = [];
    try {
      dbCities = await db
        .select({
          city: hotels.city,
          country: hotels.country,
          count: sql<number>`count(*)`,
        })
        .from(hotels)
        .where(sql`${hotels.status} = 'ACTIVE' AND (${hotels.city} ILIKE ${`%${query}%`} OR ${hotels.country} ILIKE ${`%${query}%`})`)
        .groupBy(hotels.city, hotels.country)
        .orderBy(sql`count(*) DESC`)
        .limit(limit);
    } catch (e) {
      console.error('[SUGGESTIONS DB ERROR]:', e);
    }

    const dbSuggestions = dbCities
      .filter((c) => c.city)
      .map((c) => ({
        text: `${c.city}, ${c.country}`,
        city: c.city,
        country: c.country,
        type: 'city' as const,
        source: 'db' as const,
        hotelsCount: Number(c.count),
      }));

    let hotelSuggestions: any[] = [];
    try {
      const hotelsResults = await db
        .select({
          name: hotels.name,
          slug: hotels.slug,
          city: hotels.city,
          country: hotels.country,
          stars: hotels.stars,
        })
        .from(hotels)
        .where(sql`${hotels.status} = 'ACTIVE' AND ${hotels.name} ILIKE ${`%${query}%`}`)
        .limit(5);

      hotelSuggestions = hotelsResults.map((h) => ({
        text: `${h.name}${h.stars ? ` (${h.stars}★)` : ''}, ${h.city}`,
        hotelSlug: h.slug,
        city: h.city,
        type: 'hotel' as const,
        source: 'db' as const,
      }));
    } catch (e) {
      console.error('[SUGGESTIONS HOTELS ERROR]:', e);
    }

    const maptilerSuggestions = await getMapTilerSuggestions(query, limit);

    const combined = [
      ...matchedPopular,
      ...dbSuggestions.filter((d) => !matchedPopular.some((p) => p.city === d.city)),
      ...hotelSuggestions,
      ...maptilerSuggestions.filter((m) => !matchedPopular.some((p) => p.city === m.city) && !dbSuggestions.some((d) => d.city === m.city)),
    ].slice(0, limit);

    return NextResponse.json({
      suggestions: combined,
      query,
      total: combined.length,
    });
  } catch (error: any) {
    console.error('[SUGGESTIONS ERROR]:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        suggestions: [],
        query: '',
        total: 0,
      },
      { status: 200 }
    );
  }
}
