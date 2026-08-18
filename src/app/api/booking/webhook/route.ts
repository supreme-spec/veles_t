import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const OSTROVOK_IPS = [
  '89.113.101.0/24',
  '89.113.102.0/24',
  '89.113.103.0/24',
];

function isIPInRange(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  const rangeNum = range!.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  return (ipNum & mask) === (rangeNum & mask);
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';

  const isAllowed = OSTROVOK_IPS.some(range => isIPInRange(ip, range));
  if (!isAllowed) {
    console.warn(`[WEBHOOK] Unauthorized IP: ${ip}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const partnerOrderId = body.partner_order_id || body.partnerOrderId;
    const status = body.status;
    const error = body.error;

    if (!partnerOrderId) {
      return NextResponse.json({ error: 'partner_order_id is required' }, { status: 400 });
    }

    await db.update(bookings)
      .set({
        status: status || 'unknown',
        errorMessage: error || null,
        updatedAt: new Date(),
      })
      .where(eq(bookings.partnerOrderId, partnerOrderId));

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[WEBHOOK ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Webhook failed' }, { status: 500 });
  }
}
