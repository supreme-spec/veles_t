import { NextResponse } from 'next/server';
import { db } from '@/db';
import { hotels } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const activeHotels = await db
      .select({
        seoSlug: hotels.seoSlug,
        country: hotels.country,
        city: hotels.city,
        updatedAt: hotels.updatedAt,
      })
      .from(hotels)
      .where(sql`${hotels.status} = 'ACTIVE' AND ${hotels.seoSlug} IS NOT NULL AND ${hotels.seoSlug} != ''`)
      .orderBy(hotels.updatedAt);

    const baseUrl = 'https://veles-voyage.ru';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${activeHotels
    .map(
      (hotel) => `  <url>
    <loc>${baseUrl}/hotels/${hotel.seoSlug}</loc>
    <lastmod>${hotel.updatedAt ? new Date(hotel.updatedAt).toISOString().split('T')[0] : ''}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('[HOTELS SITEMAP ERROR]:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}
