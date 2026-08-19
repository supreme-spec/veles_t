import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const RETRYABLE_ERRORS = ['timeout', 'unknown', 'duplicate_reservation', 'double_booking_form'];

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

    const maxRetries = 10;
    let lastError: any = null;
    let currentPartnerOrderId = partnerOrderId;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          currentPartnerOrderId = `order-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
        }

        const result = await ostrovokClient.createBookingProcess({
          bookHash,
          partnerOrderId: currentPartnerOrderId,
          language: language || 'ru',
          rooms,
          user,
          partner: partner || { partnerOrderId: currentPartnerOrderId },
        });

        if (result.status === 'ok') {
          return NextResponse.json({ result, attempt, partnerOrderId: currentPartnerOrderId });
        }

        lastError = result;

        const isRetryable = result.status === 'error' && RETRYABLE_ERRORS.some(e => result.error?.includes(e));

        if (!isRetryable) {
          return NextResponse.json({ error: result.error || 'Create booking failed', status: result.status, attempt }, { status: 400 });
        }
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: lastError?.error || lastError?.message || 'Create booking failed after retries', attempts: maxRetries }, { status: 500 });
  } catch (error: any) {
    console.error('[CREATE BOOKING ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Create booking failed' }, { status: 500 });
  }
}
