import { NextResponse } from 'next/server';
import { db } from '@/db';
import { bookings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: Request) {
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
