import { NextResponse } from 'next/server';
import { searchCoalescer } from '@/lib/search/coalescer';
import { searchCircuitBreaker, getStaleSearchCache, setStaleSearchCache } from '@/lib/search/circuit-breaker';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { hid: string } }) {
  const { searchParams } = new URL(req.url);
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  const adults = Number(searchParams.get('adults') || 2);
  const residency = searchParams.get('residency') || 'RU';

  const hid = Number(params.hid);

  if (!checkin || !checkout) {
    return NextResponse.json({ error: 'Missing required params: checkin, checkout' }, { status: 400 });
  }

  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`hotelpage:${userKey}:${hid}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const paramsPayload = {
    hotelIds: [hid],
    checkin,
    checkout,
    guests: [{ adults }],
    residency,
  };

  try {
    const result = await searchCircuitBreaker.execute(
      () =>
        searchCoalescer.search({
          hotelIds: [hid],
          checkin,
          checkout,
          guests: [{ adults }],
          residency,
        }),
      async () => {
        const stale = await getStaleSearchCache(paramsPayload);
        if (stale) {
          return { data: stale, cached: true, stale: true };
        }
        throw new Error('No stale cache available');
      }
    );

    if (result.cached && !result.stale) {
      await setStaleSearchCache(paramsPayload, result.data, 60 * 60);
    }

    return NextResponse.json({ result: result.data, cached: result.cached, coalesced: result.coalesced, stale: result.stale });
  } catch (error: any) {
    console.error('[HOTELPAGE ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Hotelpage failed' }, { status: 500 });
  }
}
