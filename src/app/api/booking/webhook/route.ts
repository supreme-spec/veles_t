import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const OSTROVOK_IP_RANGES = [
  '89.113.101.0/24',
  '89.113.102.0/24',
  '89.113.103.0/24',
  '185.189.12.0/24',
  '5.188.126.0/24',
];

function isIPInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr || '32');
    if (!range || isNaN(bits)) return false;
    const mask = bits === 0 ? 0 : ~(2 ** (32 - bits) - 1);
    const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    return ((ipNum & mask) >>> 0) === ((rangeNum & mask) >>> 0);
  } catch {
    return false;
  }
}

function getClientIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const webhookToken = process.env.OSTROVOK_WEBHOOK_TOKEN;

  const isAllowedIP = OSTROVOK_IP_RANGES.some(range => isIPInRange(ip, range));
  const authHeader = req.headers.get('authorization');
  const isAllowedToken = webhookToken && authHeader === `Bearer ${webhookToken}`;
  const url = new URL(req.url);
  const secretParam = url.searchParams.get('secret');
  const isAllowedSecret = webhookToken && secretParam === webhookToken;

  if (!isAllowedIP && !isAllowedToken && !isAllowedSecret) {
    console.warn(`[WEBHOOK] Unauthorized request from IP: ${ip}`);
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

    console.log(`[WEBHOOK] order=${partnerOrderId}, status=${status}, ip=${ip}`);

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
