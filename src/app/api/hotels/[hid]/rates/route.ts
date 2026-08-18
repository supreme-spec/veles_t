import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { getCached, setCached } from '@/lib/redis';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ hid: string }> }) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`hotelpage:${userKey}`, 15, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { hid } = await params;
    const body = await req.json();
    const { checkin, checkout, guests, residency = 'RU', timeout = 30 } = body;

    if (!checkin || !checkout) {
      return NextResponse.json({ error: 'checkin and checkout are required' }, { status: 400 });
    }

    if (!hid || isNaN(Number(hid))) {
      return NextResponse.json({ error: 'Invalid hid' }, { status: 400 });
    }

    const cacheKey = `hotelpage:${hid}:${checkin}:${checkout}:${JSON.stringify(guests || [])}:${residency}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    const result = await ostrovokClient.getHotelpage({
      hid: Number(hid),
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
