import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const CUTOFF_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = Math.floor(CUTOFF_MS / POLL_INTERVAL_MS);

export async function POST(req: Request) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`booking:check:${userKey}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { partnerOrderId, maxAttempts } = body;

    if (!partnerOrderId) {
      return NextResponse.json({ error: 'partnerOrderId is required' }, { status: 400 });
    }

    const attempts = typeof maxAttempts === 'number' ? Math.min(maxAttempts, MAX_ATTEMPTS) : MAX_ATTEMPTS;
    const startTime = Date.now();

    for (let i = 0; i < attempts; i++) {
      try {
        const result = await ostrovokClient.checkBookingProcess(partnerOrderId);

        if (result.status === 'ok') {
          return NextResponse.json({ success: true, result, attempt: i + 1 });
        }

        const terminalStatuses = ['block', 'charge', '3ds', 'soldout', 'error', 'failed', 'cancelled'];
        if (terminalStatuses.includes(result.status) || terminalStatuses.includes(result.error)) {
          return NextResponse.json({ failed: true, result, attempt: i + 1 }, { status: 400 });
        }

        if (Date.now() - startTime >= CUTOFF_MS) {
          return NextResponse.json(
            { failed: true, error: 'booking_timeout', message: 'Превышено время ожидания подтверждения', attempt: i + 1 },
            { status: 504 }
          );
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      } catch (error: any) {
        if (i === attempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }

    return NextResponse.json(
      { failed: true, error: 'booking_timeout', message: 'Превышено время ожидания подтверждения', attempts },
      { status: 504 }
    );
  } catch (error: any) {
    console.error('[CHECK BOOKING ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Check booking failed' }, { status: 500 });
  }
}
