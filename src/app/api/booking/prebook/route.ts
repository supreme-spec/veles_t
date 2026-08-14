import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookHash, priceIncreasePercent } = body;

    if (!bookHash) {
      return NextResponse.json({ error: 'bookHash is required' }, { status: 400 });
    }

    const result = await ostrovokClient.prebookFromHotelpage({
      bookHash,
      priceIncreasePercent,
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[PREBOOK ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Prebook failed' }, { status: 500 });
  }
}
