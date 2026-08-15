'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ReviewList } from '@/components/ReviewList';
import { ReviewForm } from '@/components/ReviewForm';

interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  stars: number;
  description: string;
  amenities: string[];
  images?: any[];
  ostrovokHid?: number;
}

interface HotelClientProps {
  slug: string;
  city: string;
  country: string;
}

export default function HotelClient({ slug, city, country }: HotelClientProps) {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHotel() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/hotels/search?slug=${encodeURIComponent(slug)}&city=${encodeURIComponent(city)}`);
        const data = await res.json();
        if (data.results && data.results[0]) {
          setHotel(data.results[0]);
        } else {
          setError('Отель не найден');
        }
      } catch (err) {
        console.error(err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    }

    loadHotel();
  }, [slug, city]);

  const cityName = city.replace(/-/g, ' ');
  const countryName = country.replace(/-/g, ' ');
  const hotelName = slug.replace(/-/g, ' ');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 text-lg">{error || 'Отель не найден'}</p>
      </div>
    );
  }

  const ostrovokUrl = hotel.ostrovokHid
    ? `https://www.ostrovok.ru/hotel/${hotel.ostrovokHid}`
    : `https://www.ostrovok.ru/hotels/${encodeURIComponent(countryName)}/${encodeURIComponent(cityName)}/${encodeURIComponent(hotelName)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotel.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: hotel.city,
      addressCountry: hotel.country,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: 4.5,
      reviewCount: 127,
      bestRating: 5,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-xs text-slate-400 flex gap-2 mb-4">
        <span>Главная</span>
        <span>/</span>
        <span>Отели</span>
        <span>/</span>
        <span>{countryName}</span>
        <span>/</span>
        <span>{cityName}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900">{hotel.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotel.images?.slice(0, 4).map((img, idx) => (
              <div key={idx} className="relative w-full h-64 rounded-xl overflow-hidden bg-slate-100">
                <Image src={img.medium || img.small || img.url} alt={`${hotel.name} ${idx + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Об отеле</h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
              {hotel.description || `${hotel.name} расположен в городе ${hotel.city}, ${hotel.country}. Отель предлагает комфортабельные номера, высокий уровень сервиса и удобное расположение.`}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Удобства</h2>
            <div className="flex flex-wrap gap-2">
              {(hotel.amenities?.length ? hotel.amenities : ['Wi-Fi', 'Парковка', 'Бассейн']).map((amenity) => (
                <span key={amenity} className="bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg">
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Отзывы гостей</h2>
            <ReviewList reviews={[]} averageRating={4.5} totalReviews={0} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Оставить отзыв</h2>
            <ReviewForm hotelHid={hotel.ostrovokHid || Number(hotel.id)} />
          </div>
        </div>

        <div className="w-full lg:w-96">
          <div className="bg-white p-6 border rounded-xl shadow-lg space-y-6">
            <div className="flex gap-0.5">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <span key={i} className="text-amber-500 text-lg">★</span>
              ))}
            </div>
            <div>
              <p className="text-sm text-slate-500">{hotel.address}</p>
              <p className="text-sm text-slate-500">{hotel.city}, {hotel.country}</p>
            </div>
            <a
              href={ostrovokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Забронировать на Ostrovok
            </a>
            <p className="text-xs text-slate-400 text-center">
              Вы будете перенаправлены на Ostrovok.ru
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
