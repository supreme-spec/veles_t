import { NextResponse } from 'next/server';
import { ostrovokClient } from '@/lib/ostrovok/client';
import { db } from '@/db';
import { hotels, reviews } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ hid: string }> }) {
  const { hid } = await params;

  try {
    const [hotel] = await db
      .select()
      .from(hotels)
      .where(eq(hotels.ostrovokHid, Number(hid)))
      .limit(1);

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const staleHours = (Date.now() - hotel.lastSyncedAt.getTime()) / (1000 * 60 * 60);

    if (staleHours > 24 || !hotel.description) {
      try {
        const content = await ostrovokClient.getHotelContent(hotel.ostrovokHid);

        const payload: any = {
          lastSyncedAt: new Date(),
          lastSeenAt: new Date(),
        };

        if (content?.name && !hotel.name) payload.name = content.name;
        if (content?.description_struct?.[0]?.paragraphs && !hotel.description) {
          payload.description = content.description_struct[0].paragraphs.join('\n');
        }
        if (Array.isArray(content?.images) && (!hotel.images || hotel.images.length === 0)) payload.images = content.images;
        if (Array.isArray(content?.amenity_groups) && (!hotel.amenities || hotel.amenities.length === 0)) {
          const amenities = content.amenity_groups.flatMap((g: any) => g.amenities || []);
          payload.amenities = amenities;
        }
        if (content?.contacts && !hotel.contacts) payload.contacts = content.contacts;
        if (content?.address && !hotel.address) payload.address = content.address;
        if (content?.metapolicy_struct?.cancellation_penalties && !hotel.cancellationPolicies) {
          payload.cancellationPolicies = content.metapolicy_struct.cancellation_penalties;
        }
        if (content?.metapolicy_struct?.meal && !hotel.roomsData) {
          payload.roomsData = {
            mealTypes: content.metapolicy_struct.meal,
            taxes: content.metapolicy_struct.tax_data?.taxes || [],
          };
        }

        await db.update(hotels).set(payload).where(eq(hotels.id, hotel.id));
      } catch (e) {
        console.error(`[HOTEL DETAIL LAZY ERROR]:`, e);
      }
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
      hotel: {
        ...hotel,
        cancellationPolicies: hotel.cancellationPolicies,
        roomsData: hotel.roomsData,
      },
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
