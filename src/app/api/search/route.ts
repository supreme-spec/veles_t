import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { db } from '@/db';
import { hotels } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  const adults = Number(searchParams.get('adults') || '2');
  const residency = searchParams.get('residency') || 'RU';

  if (!city || !checkin || !checkout) {
    return NextResponse.json({ error: 'Missing required params: city, checkin, checkout' }, { status: 400 });
  }

  try {
    const results = await ostrovokClient.searchByRegion({
      regionId: Number(city),
      checkin,
      checkout,
      guests: [{ adults }],
      residency,
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[SEARCH ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
