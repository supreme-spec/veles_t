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

interface Review {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  createdAt: string;
  verified: boolean;
}

interface HotelClientProps {
  slug: string;
  city: string;
  country: string;
}

export default function HotelClient({ slug, city, country }: HotelClientProps) {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
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
          const h = data.results[0];
          setHotel(h);
          await loadReviews(h.ostrovokHid || Number(h.id));
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

  const loadReviews = async (hotelHid: number) => {
    try {
      const res = await fetch(`/api/reviews?hotelHid=${hotelHid}`);
      const data = await res.json();
      if (data.reviews) {
        setReviews(data.reviews);
        setAverageRating(data.aggregate?.averageRating || 0);
        setReviewsCount(data.aggregate?.totalReviews || 0);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const handleReviewSubmitted = () => {
    if (hotel) {
      loadReviews(hotel.ostrovokHid || Number(hotel.id));
    }
  };

  const cityName = city.replace(/-/g, ' ');
  const countryName = country.replace(/-/g, ' ');

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
      ratingValue: averageRating || 4.5,
      reviewCount: reviewsCount || 0,
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
            <ReviewList
              reviews={reviews}
              averageRating={averageRating}
              totalReviews={reviewsCount}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Оставить отзыв</h2>
            <ReviewForm
              hotelHid={hotel.ostrovokHid || Number(hotel.id)}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>
        </div>

        <div className="w-full lg:w-96">
          <div className="bg-white p-6 border rounded-xl shadow-lg space-y-6">
            <div>
              <h3 className="text-lg font-bold">Бронирование</h3>
              <p className="text-sm text-slate-500 mt-2">
                Для бронирования свяжитесь с нами по телефону или через форму обратной связи. Мы подберем лучший тариф и подтвердим бронирование.
              </p>
            </div>
            <a
              href="tel:+79850635134"
              className="block w-full text-center bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Позвонить для бронирования
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
