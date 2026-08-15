'use client';

import { useState } from 'react';

interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  stars: number;
  images?: any[];
}

export function HotelSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Город, отель или страна"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-base px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Поиск...' : 'Найти отели'}
            </button>
          </div>
        </div>
      </form>

      {searched && results.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-500 text-lg">Отели не найдены. Попробуйте изменить запрос.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((hotel) => (
            <div key={hotel.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="relative w-full h-64 bg-slate-100 overflow-hidden">
                {hotel.images?.[0]?.medium ? (
                  <img src={hotel.images[0].medium} alt={hotel.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">Нет фото</div>
                )}
              </div>
              <div className="p-6">
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: hotel.stars }).map((_, i) => (
                    <span key={i} className="text-amber-500 text-sm">★</span>
                  ))}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">{hotel.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{hotel.city}, {hotel.country}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
