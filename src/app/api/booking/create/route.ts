import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`booking:create:${userKey}`, 5, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { bookHash, partnerOrderId, rooms, user, partner, language } = body;

    if (!bookHash || !partnerOrderId || !rooms?.length || !user?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await ostrovokClient.createBookingProcess({
      bookHash,
      partnerOrderId,
      language: language || 'ru',
      rooms,
      user,
      partner: partner || { partnerOrderId },
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[CREATE BOOKING ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Create booking failed' }, { status: 500 });
  }
}
