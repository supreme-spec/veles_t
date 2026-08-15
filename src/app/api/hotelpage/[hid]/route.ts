import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { db } from '@/db';
import { hotels, reviews } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ hid: string }> }) {
  const { hid } = await params;

  try {
    const hotel = await db
      .select()
      .from(hotels)
      .where(eq(hotels.ostrovokHid, Number(hid)))
      .limit(1);

    if (hotel.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const hotelReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.hotelHid, Number(hid)))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    const aggregateResult = await db
      .select({
        averageRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`,
        totalReviews: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(eq(reviews.hotelHid, Number(hid)));

    const aggregate = aggregateResult[0] || { averageRating: 0, totalReviews: 0 };

    return NextResponse.json({
      hotel: hotel[0],
      reviews: hotelReviews,
      aggregate: {
        averageRating: Number(aggregate.averageRating),
        totalReviews: Number(aggregate.totalReviews),
      },
    });
  } catch (error: any) {
    console.error('[HOTEL DETAIL ERROR]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch hotel' }, { status: 500 });
  }
}
