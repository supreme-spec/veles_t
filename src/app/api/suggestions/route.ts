import { NextResponse } from 'next/server';
import { db } from '@/db';
import { hotels } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

const POPULAR_CITIES = [
  { city: 'Москва', country: 'Россия', slug: 'moscow' },
  { city: 'Санкт-Петербург', country: 'Россия', slug: 'saint-petersburg' },
  { city: 'Сочи', country: 'Россия', slug: 'sochi' },
  { city: 'Казань', country: 'Россия', slug: 'kazan' },
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
        source: 'popular',
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
        source: 'db',
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
        source: 'db',
      }));
    } catch (e) {
      console.error('[SUGGESTIONS HOTELS ERROR]:', e);
    }

    const combined = [
      ...matchedPopular,
      ...dbSuggestions.filter((d) => !matchedPopular.some((p) => p.city === d.city)),
      ...hotelSuggestions,
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
