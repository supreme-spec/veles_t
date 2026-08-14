import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`booking:status:${userKey}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { partnerOrderId } = body;

    if (!partnerOrderId) {
      return NextResponse.json({ error: 'partnerOrderId is required' }, { status: 400 });
    }

    const result = await ostrovokClient.checkBookingProcess(partnerOrderId);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[CHECK BOOKING ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Check booking failed' }, { status: 500 });
  }
}
