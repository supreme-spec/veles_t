'use client';

import { useState } from 'react';
import { HotelSearchSERP } from '@/components/hotels/search-results';
import { hotelsSchema, faqSchema, howToSchema } from './metadata';
import { SITE_URL } from '@/shared/constants/seo';
import Image from 'next/image';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1763094006165-7db02c4abb61?w=1200&h=630&fit=crop&auto=format';

function StructuredData({ schemas }: { schemas: object[] }) {
  const validSchemas = Array.isArray(schemas) ? schemas.filter(schema => schema && typeof schema === 'object') : [];
  if (validSchemas.length === 0) return null;
  return (
    <>
      {validSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export default function HotelsPage() {
  const [filters, setFilters] = useState({
    query: '',
    stars: [] as number[],
    amenities: [] as string[],
    priceRange: [0, 50000] as [number, number]
  });
  const [guests, setGuests] = useState('2');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('q') as string;
    const stars = formData.getAll('stars').map(Number);

    setFilters(prev => ({
      ...prev,
      query,
      stars,
    }));
  };

  const toggleStar = (star: number) => {
    setFilters(prev => ({
      ...prev,
      stars: prev.stars.includes(star) ? prev.stars.filter(s => s !== star) : [...prev.stars, star]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-20 pt-20 md:pt-24">
        
        {/* Hero Section */}
        <header className="text-center mb-16">
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
            <Image
              src={HERO_IMAGE}
              alt="Поиск и бронирование отелей по всему миру онлайн через Велес Вояж"
              width={1200}
              height={630}
              className="w-full h-full object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg">
                🏨 Отели по всему миру
              </h1>
              <p className="text-white/90 mt-2 text-lg">Поиск и бронирование отелей онлайн</p>
            </div>
          </div>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Найдите и забронируйте отели с гарантией лучшей цены. Более 200 стран, мгновенное подтверждение, поддержка 24/7.
          </p>
        </header>

        {/* Search Form */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-12 max-w-5xl mx-auto border border-gray-200 dark:border-gray-700" aria-labelledby="hotels-search-heading">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Куда</label>
                <input
                  type="text"
                  name="q"
                  placeholder="Город, отель или страна"
                  defaultValue={filters.query}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Заезд</label>
                <input
                  type="date"
                  name="checkin"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Выезд</label>
                <input
                  type="date"
                  name="checkout"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Гости</label>
                <select
                  name="guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">1 гость</option>
                  <option value="2">2 гостя</option>
                  <option value="3">3 гостя</option>
                  <option value="4">4 гостя</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Звезды</label>
                <div className="flex gap-2 mt-2">
                  {[5, 4, 3].map((star) => (
                    <label key={star} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.stars.includes(star)}
                        onChange={() => toggleStar(star)}
                        className="rounded border-gray-300 text-blue-900 focus:ring-blue-900 h-4 w-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{star}★</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold text-base px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-300"
                >
                  Найти отели
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Search Results */}
        <HotelSearchSERP filters={filters} onHotelSelect={(hotel) => console.log('Selected hotel:', hotel)} />

        {/* SEO Content */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-16 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 mt-16" aria-labelledby="hotels-seo-heading">
          <h2 id="hotels-seo-heading" className="text-3xl font-extrabold mb-6 text-center text-gray-900 dark:text-white">
            Поиск и бронирование отелей по всему миру с Велес Вояж
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <p className="mb-6">
              Велес Вояж — это современное турагентство с прямой интеграцией с отельными системами, которое помогает находить и бронировать отели по всему миру онлайн. Мы объединили сотни проверенных партнеров, чтобы предложить вам максимально широкий выбор размещения: от бюджетных хостелов и гостиниц до премиум-отелей 5* и люксовых курортов.
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">🏨 Какие отели доступны для бронирования?</h3>
            <p className="mb-6">
              В нашей базе — отели всех категорий и типов размещения. Вы можете забронировать городской отель в центре Москвы или Санкт-Петербурга, пляжный курорт в Турции или Египте, горный отель в Альпах или на Алтае, спа-отель в Европе или бутик-отель на островах.
            </p>
          </div>
        </section>

        {/* Structured Data */}
        <StructuredData schemas={[hotelsSchema, faqSchema, howToSchema]} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Велес Вояж",
              "url": `${SITE_URL}`,
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${SITE_URL}/hotels?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </div>
    </div>
  );
}
