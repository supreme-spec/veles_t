import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { checkRateLimit, getUserKey } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const partnerOrderId = url.searchParams.get('partner_order_id');
  const status = url.searchParams.get('status');

  if (!partnerOrderId) {
    return NextResponse.redirect(new URL('/booking/error?reason=missing_order_id', req.url));
  }

  if (status === 'ok') {
    return NextResponse.redirect(new URL(`/booking/success?order=${partnerOrderId}`, req.url));
  }

  if (status === '3ds') {
    return NextResponse.redirect(new URL(`/booking/3ds?order=${partnerOrderId}`, req.url));
  }

  return NextResponse.redirect(new URL(`/booking/error?order=${partnerOrderId}&status=${status || 'unknown'}`, req.url));
}

export async function POST(req: Request) {
  const userKey = getUserKey(req);
  if (!(await checkRateLimit(`booking:3ds:${userKey}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { partnerOrderId } = body;

    if (!partnerOrderId) {
      return NextResponse.json({ error: 'partnerOrderId is required' }, { status: 400 });
    }

    const result = await ostrovokClient.checkBookingProcess(partnerOrderId);

    if (result.status === 'ok') {
      return NextResponse.json({ status: 'ok', result });
    }

    if (result.status === '3ds') {
      return NextResponse.json({ status: '3ds', result });
    }

    return NextResponse.json({ status: result.status || 'processing', result });
  } catch (error: any) {
    console.error('[3DS CALLBACK ERROR]:', error);
    return NextResponse.json({ error: error.message || '3DS callback failed' }, { status: 500 });
  }
}
