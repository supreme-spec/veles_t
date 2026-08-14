import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { getCached, setCached } from '@/lib/redis';

export const runtime = 'nodejs';

function cacheKey(params: Record<string, string>) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `search:${sorted}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  const adults = Number(searchParams.get('adults') || 2);
  const residency = searchParams.get('residency') || 'RU';

  if (!q || !checkin || !checkout) {
    return NextResponse.json({ error: 'Missing required params: q, checkin, checkout' }, { status: 400 });
  }

  const key = cacheKey({ q, checkin, checkout, adults: String(adults), residency });

  try {
    const cached = await getCached<any>(key);
    if (cached) {
      return NextResponse.json({ results: cached, cached: true });
    }

    const results = await ostrovokClient.searchByRegion({
      regionId: Number(q),
      checkin,
      checkout,
      guests: [{ adults }],
      residency,
    });

    await setCached(key, results, 900);

    return NextResponse.json({ results, cached: false });
  } catch (error: any) {
    console.error('[SEARCH ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
