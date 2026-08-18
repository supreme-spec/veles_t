import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const FINAL_ERRORS = ['block', 'charge', '3ds', 'soldout', 'provider', 'book_limit'];
const CUTOFF_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = Math.floor(CUTOFF_MS / POLL_INTERVAL_MS);

export async function POST(req: Request) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`booking:check:${userKey}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { partnerOrderId, maxAttempts = MAX_ATTEMPTS, intervalMs = POLL_INTERVAL_MS } = body;

    if (!partnerOrderId) {
      return NextResponse.json({ error: 'partnerOrderId is required' }, { status: 400 });
    }

    const attempts = Math.min(maxAttempts, MAX_ATTEMPTS);
    const startTime = Date.now();

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await ostrovokClient.checkBookingProcess(partnerOrderId);

        if (result.status === 'ok') {
          return NextResponse.json({
            success: true,
            attempt,
            result,
            partnerOrderId: result.partner_order_id || partnerOrderId,
            ostrovokOrderId: result.ostrovok_order_id,
          });
        }

        if (FINAL_ERRORS.includes(result.error)) {
          return NextResponse.json({
            success: false,
            failed: true,
            error: result.error,
            message: 'Бронирование отклонено поставщиком',
            attempt,
            result,
          }, { status: 400 });
        }

        if (attempt < attempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
          continue;
        }

        return NextResponse.json({
          success: false,
          status: result.status,
          error: result.error,
          attempt,
          maxAttempts: attempts,
          message: 'Бронирование ещё обрабатывается, проверьте статус позже',
        });
      } catch (error: any) {
        if (error.response?.status >= 500 && attempt < attempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({
      success: false,
      error: 'booking_timeout',
      message: 'Превышено время ожидания подтверждения бронирования',
      maxAttempts: attempts,
    }, { status: 504 });
  } catch (error: any) {
    console.error('[CHECK BOOKING ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Check booking failed' }, { status: 500 });
  }
}
