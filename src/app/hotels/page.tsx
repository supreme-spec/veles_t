import { db } from '@/db';
import { hotels } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { HotelCard } from '@/components/HotelCard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Отели - Велес Вояж',
  description: 'Найдите идеальный отель для вашего путешествия. Лучшие цены, мгновенное подтверждение, поддержка 24/7.',
};

export default async function HotelsPage() {
  const allHotels = await db
    .select()
    .from(hotels)
    .where(eq(hotels.status, 'ACTIVE'))
    .orderBy(desc(hotels.createdAt))
    .limit(50);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Отели</h1>
          <p className="text-slate-500 mt-2">Найдено {allHotels.length} отелей в нашей базе</p>
        </div>

        {allHotels.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <p className="text-slate-500 text-lg">Отели пока не загружены. Запустите синхронизацию: <code className="bg-slate-100 px-2 py-1 rounded">npm run sync:hotels</code></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allHotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
