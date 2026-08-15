import type { Metadata } from 'next';
import HotelClient from './HotelClient';

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
  return [
    { country: 'russia', city: 'moscow', hotel: 'grand-hotel-metropol' },
    { country: 'russia', city: 'sochi', hotel: 'test-resort' },
  ];
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
