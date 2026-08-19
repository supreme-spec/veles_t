import type { Metadata } from 'next';
import HotelClient from './HotelClient';
import { db } from '@/db';
import { hotels } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { slugify } from '@/lib/slugify';

const SITE_URL = 'https://veles-voyage.ru';

export const revalidate = 3600;

interface HotelPageProps {
  params: Promise<{
    country: string;
    city: string;
    hotel: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const activeHotels = await db
      .select()
      .from(hotels)
      .where(eq(hotels.status, 'ACTIVE'))
      .limit(100);

    return activeHotels
      .filter((h) => h.seoSlug && h.city && h.country)
      .map((h) => ({
        country: slugify(h.country!),
        city: slugify(h.city!),
        hotel: h.seoSlug,
      }));
  } catch (error) {
    console.warn('[generateStaticParams] Database unavailable, returning empty params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: HotelPageProps): Promise<Metadata> {
  const { country, city, hotel } = await params;
  return {
    title: `${hotel.replace(/-/g, ' ')} - отель в ${city.replace(/-/g, ' ')} | Велес Вояж`,
    description: `Бронирование отеля ${hotel.replace(/-/g, ' ')} в городе ${city.replace(/-/g, ' ')}. Лучшие цены, мгновенное подтверждение, поддержка 24/7.`,
    alternates: {
      canonical: `${SITE_URL}/hotels/${country}/${city}/${hotel}`,
    },
    openGraph: {
      title: `${hotel.replace(/-/g, ' ')} | Велес Вояж`,
      description: `Бронирование отеля в ${city.replace(/-/g, ' ')} через официальное турагентство Велес Вояж.`,
      url: `${SITE_URL}/hotels/${country}/${city}/${hotel}`,
      type: 'website',
    },
  };
}

export default async function HotelDetailPage({ params }: HotelPageProps) {
  const { country, city, hotel } = await params;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <HotelClient slug={hotel} city={city} country={country} />
    </main>
  );
}
