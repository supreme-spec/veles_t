import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`booking:${userKey}`))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { bookHash } = body;

    if (!bookHash) {
      return NextResponse.json({ error: 'bookHash is required' }, { status: 400 });
    }

    const result = await ostrovokClient.createBookingProcess({
      bookHash,
      book_data: {},
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[BOOKING ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Booking failed' }, { status: 500 });
  }
}
