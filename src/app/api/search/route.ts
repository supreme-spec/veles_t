import { NextResponse } from 'next/server';
import { searchCoalescer } from '@/lib/search/coalescer';
import { searchCircuitBreaker, getStaleSearchCache, setStaleSearchCache } from '@/lib/search/circuit-breaker';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

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

  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`search:${userKey}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const params = {
    regionId: Number(q),
    checkin,
    checkout,
    guests: [{ adults }],
    residency,
  };

  try {
    const result = await searchCircuitBreaker.execute(
      () => searchCoalescer.search(params),
      async () => {
        const stale = await getStaleSearchCache(params);
        if (stale) {
          return { data: stale, cached: true, stale: true };
        }
        throw new Error('No stale cache available');
      }
    );

    if (result.cached && !result.stale) {
      await setStaleSearchCache(params, result.data, 60 * 60);
    }

    return NextResponse.json({ results: result.data, cached: result.cached, coalesced: result.coalesced, stale: result.stale });
  } catch (error: any) {
    console.error('[SEARCH ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
