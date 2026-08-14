import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { hid: string } }) {
  const { searchParams } = new URL(req.url);
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  const adults = Number(searchParams.get('adults') || 2);
  const residency = searchParams.get('residency') || 'RU';

  const hid = Number(params.hid);

  if (!checkin || !checkout) {
    return NextResponse.json({ error: 'Missing required params: checkin, checkout' }, { status: 400 });
  }

  try {
    const result = await ostrovokClient.getHotelpage({
      hid,
      checkin,
      checkout,
      guests: [{ adults }],
      residency,
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[HOTELPAGE ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Hotelpage failed' }, { status: 500 });
  }
}
