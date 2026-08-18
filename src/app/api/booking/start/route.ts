import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`booking:start:${userKey}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { bookHash, partnerOrderId, rooms, user, partner, paymentType, returnPath, language } = body;

    if (!bookHash) {
      return NextResponse.json({ error: 'bookHash is required' }, { status: 400 });
    }

    try {
      const result = await ostrovokClient.startBookingProcess({
        bookHash,
        partnerOrderId,
        language: language || 'ru',
        rooms,
        user,
        partner: partner || { partnerOrderId },
        paymentType,
        returnPath,
      });

      return NextResponse.json({ result });
    } catch (error: any) {
      if (error.response?.status >= 500) {
        return NextResponse.json(
          { status: 'in_progress', message: 'Please check booking status via /api/booking/check' },
          { status: 202 }
        );
      }
      console.error('[START BOOKING ERROR]:', error);
      return NextResponse.json({ error: error.message || 'Start booking failed' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[START BOOKING ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Start booking failed' }, { status: 500 });
  }
}
