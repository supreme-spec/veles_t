import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { getCached, setCached } from '@/lib/redis';

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

  const key = `hotelpage:${hid}:${checkin}:${checkout}:${adults}:${residency}`;

  try {
    const cached = await getCached<any>(key);
    if (cached) {
      return NextResponse.json({ result: cached, cached: true });
    }

    const result = await ostrovokClient.getHotelpage({
      hid,
      checkin,
      checkout,
      guests: [{ adults }],
      residency,
    });

    await setCached(key, result, 900);

    return NextResponse.json({ result, cached: false });
  } catch (error: any) {
    console.error('[HOTELPAGE ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Hotelpage failed' }, { status: 500 });
  }
}
