import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const OSTROVOK_IP_RANGES = [
  '89.113.101.0/24',
  '89.113.102.0/24',
];

function isIPInRange(ip: string, range: string): boolean {
  const parts = range.split('/');
  const rangeIp = parts[0];
  const prefix = Number(parts[1]);
  if (!rangeIp || Number.isNaN(prefix)) return false;

  const ipParts = ip.split('.').map(Number);
  const rangeParts = rangeIp.split('.').map(Number);

  if (ipParts.some(p => Number.isNaN(p)) || rangeParts.some(p => Number.isNaN(p))) return false;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const ipNum = ((ipParts[0] || 0) << 24 | (ipParts[1] || 0) << 16 | (ipParts[2] || 0) << 8 | (ipParts[3] || 0)) >>> 0;
  const rangeNum = ((rangeParts[0] || 0) << 24 | (rangeParts[1] || 0) << 16 | (rangeParts[2] || 0) << 8 | (rangeParts[3] || 0)) >>> 0;

  return (ipNum & mask) === (rangeNum & mask);
}

function isOstrovokIP(req: Request): boolean {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = (forwarded?.split(',')[0]?.trim() || realIp || '') as string;

  if (!ip) return false;
  return OSTROVOK_IP_RANGES.some(range => isIPInRange(ip, range));
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!isOstrovokIP(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
