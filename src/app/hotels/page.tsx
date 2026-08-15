import type { Metadata } from 'next';
import Image from 'next/image';
import { HotelSearch } from './HotelSearch';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1763094006165-7db02c4abb61?w=1200&h=630&fit=crop&auto=format';

export const metadata: Metadata = {
  title: 'Поиск отелей - Велес Вояж',
  description: 'Найдите идеальный отель для вашего путешествия. Лучшие цены, мгновенное подтверждение, поддержка 24/7.',
};

export default function HotelsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-20 pt-20 md:pt-24">
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
        </header>

        <HotelSearch />

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-16 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 mt-16">
          <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-900 dark:text-white">
            Поиск и бронирование отелей по всему миру с Велес Вояж
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <p className="mb-6">
              Велес Вояж — это современное турагентство с прямой интеграцией с отельными системами, которое помогает находить и бронировать отели по всему миру онлайн. Мы объединили сотни проверенных партнеров, чтобы предложить вам максимально широкий выбор размещения: от бюджетных хостелов и гостиниц до премиум-отелей 5* и люксовых курортов.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
