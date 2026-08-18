import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { getCached, setCached } from '@/lib/redis';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`hotelpage:${userKey}`, 15, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { slug } = await params;
    const body = await req.json();
    const { checkin, checkout, guests, residency = 'RU', timeout = 30 } = body;

    if (!checkin || !checkout) {
      return NextResponse.json({ error: 'checkin and checkout are required' }, { status: 400 });
    }

    if (!slug || isNaN(Number(slug))) {
      return NextResponse.json({ error: 'Invalid hid' }, { status: 400 });
    }

    const cacheKey = `hotelpage:${slug}:${checkin}:${checkout}:${JSON.stringify(guests || [])}:${residency}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const result = await ostrovokClient.getHotelpage({
      hid: Number(slug),
      checkin,
      checkout,
      guests: guests || [{ adults: 2 }],
      residency,
      timeout,
    });

    if (result.status !== 'ok') {
      return NextResponse.json({
        success: false,
        error: result.error || 'Hotelpage failed',
      }, { status: 500 });
    }

    const hotelData = result.result?.results?.[0] || null;
    const payload = {
      success: true,
      hotel: hotelData,
      rates: hotelData?.rates || [],
      cached: false,
    };

    await setCached(cacheKey, payload, 300);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[HOTELPAGE RATES ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
