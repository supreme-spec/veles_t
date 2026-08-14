import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ReviewList } from '@/components/ReviewList';
import { ReviewForm } from '@/components/ReviewForm';
import { SITE_URL } from '@/shared/constants/seo';

interface HotelPageProps {
  params: {
    country: string;
    city: string;
    hotel: string;
  };
}

export async function generateMetadata({ params }: HotelPageProps): Promise<Metadata> {
  return {
    title: `${params.hotel.replace(/-/g, ' ')} - отель в ${params.city.replace(/-/g, ' ')} | Велес Вояж`,
    description: `Бронирование отеля ${params.hotel.replace(/-/g, ' ')} в городе ${params.city.replace(/-/g, ' ')}. Лучшие цены, мгновенное подтверждение, поддержка 24/7.`,
    alternates: {
      canonical: `${SITE_URL}/hotels/${params.country}/${params.city}/${params.hotel}`,
    },
    openGraph: {
      title: `${params.hotel.replace(/-/g, ' ')} | Велес Вояж`,
      description: `Бронирование отеля в ${params.city.replace(/-/g, ' ')} через официальное турагентство Велес Вояж.`,
      url: `${SITE_URL}/hotels/${params.country}/${params.city}/${params.hotel}`,
      type: 'website',
    },
  };
}

export default function HotelDetailPage({ params }: HotelPageProps) {
  const hotelName = params.hotel.replace(/-/g, ' ');
  const cityName = params.city.replace(/-/g, ' ');
  const countryName = params.country.replace(/-/g, ' ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    'name': hotelName,
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': cityName,
      'addressCountry': countryName,
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': 4.5,
      'reviewCount': 127,
      'bestRating': 5,
    },
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
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

      <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">{hotelName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Об отеле</h2>
            <p className="text-slate-600 leading-relaxed">
              {hotelName} расположен в городе {cityName}, {countryName}. Отель предлагает комфортабельные номера,
              высокий уровень сервиса и удобное расположение. Идеально подходит как для деловых поездок, так и для
              отдыха.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Удобства</h2>
            <div className="flex flex-wrap gap-2">
              {['Wi-Fi', 'Парковка', 'Бассейн', 'Спа', 'Ресторан', 'Конференц-зал', 'Трансфер', 'Фитнес'].map((amenity) => (
                <span key={amenity} className="bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg">
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Отзывы гостей</h2>
            <ReviewList
              reviews={[]}
              averageRating={4.5}
              totalReviews={0}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Оставить отзыв</h2>
            <ReviewForm hotelHid={Number(params.hotel)} />
          </div>
        </div>

        <div className="bg-white p-6 border rounded-xl shadow-lg h-fit space-y-6">
          <h3 className="text-lg font-bold">Бронирование номеров</h3>
          <p className="text-sm text-slate-500">
            Для бронирования свяжитесь с нами по телефону или через форму обратной связи. Мы подберем лучший тариф и
            подтвердим бронирование.
          </p>
          <a
            href="tel:+79850635134"
            className="block w-full text-center bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Позвонить для бронирования
          </a>
        </div>
      </div>
    </main>
  );
}
