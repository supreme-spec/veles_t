import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const partnerOrderId = url.searchParams.get('partner_order_id');
  const status = url.searchParams.get('status');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!partnerOrderId) {
    return NextResponse.redirect(new URL('/booking/error?error=missing_order_id', baseUrl));
  }

  if (status === 'ok') {
    return NextResponse.redirect(
      new URL(`/booking/success?order=${partnerOrderId}`, baseUrl)
    );
  }

  if (status === '3ds') {
    return NextResponse.redirect(
      new URL(`/booking/3ds?order=${partnerOrderId}`, baseUrl)
    );
  }

  return NextResponse.redirect(
    new URL(`/booking/error?order=${partnerOrderId}&status=${status}`, baseUrl)
  );
}
