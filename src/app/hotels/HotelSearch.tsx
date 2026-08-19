'use client';

import { useState, useEffect, useRef } from 'react';

interface Suggestion {
  text: string;
  city?: string;
  country?: string;
  hotelSlug?: string;
  type: 'city' | 'hotel';
  source?: string;
}

interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  stars?: number | null;
  images?: any[];
  ostrovokHid?: number;
  slug?: string;
}

function getDefaultCheckDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 4);
  return {
    checkin: tomorrow.toISOString().split('T')[0],
    checkout: dayAfter.toISOString().split('T')[0],
  };
}

const defaultDates = getDefaultCheckDates();

const CITIES = [
  { name: 'Москва', country: 'Россия', slug: 'moscow', countrySlug: 'russia' },
  { name: 'Санкт-Петербург', country: 'Россия', slug: 'saint-petersburg', countrySlug: 'russia' },
  { name: 'Сочи', country: 'Россия', slug: 'sochi', countrySlug: 'russia' },
  { name: 'Казань', country: 'Россия', slug: 'kazan', countrySlug: 'russia' },
  { name: 'Дубай', country: 'ОАЭ', slug: 'dubai', countrySlug: 'uae' },
  { name: 'Стамбул', country: 'Турция', slug: 'istanbul', countrySlug: 'turkey' },
  { name: 'Бангкок', country: 'Таиланд', slug: 'bangkok', countrySlug: 'thailand' },
];

export function HotelSearch() {
  const [query, setQuery] = useState('');
  const [checkin, setCheckin] = useState(defaultDates.checkin);
  const [checkout, setCheckout] = useState(defaultDates.checkout);
  const [adults, setAdults] = useState('2');
  const [childrenCount, setChildrenCount] = useState('0');
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [results, setResults] = useState<Hotel[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(query.length > 0 || (data.suggestions && data.suggestions.length > 0));
        }
      } catch (e) {
        console.error('[SUGGESTIONS FETCH ERROR]:', e);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'city') {
      setQuery(suggestion.city || suggestion.text);
    } else if (suggestion.type === 'hotel') {
      setQuery(suggestion.text);
    }
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const url = new URL('/api/search', window.location.origin);
      url.searchParams.set('q', query);
      if (checkin) url.searchParams.set('checkin', checkin);
      if (checkout) url.searchParams.set('checkout', checkout);
      url.searchParams.set('adults', adults);
      if (childrenCount !== '0' && childrenAges.length > 0) {
        url.searchParams.set('children', JSON.stringify(childrenAges));
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка поиска');
        setResults([]);
        return;
      }

      if (data.results && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка соединения с сервером');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChildrenCountChange = (count: string) => {
    setChildrenCount(count);
    const numCount = parseInt(count);
    setChildrenAges(Array(numCount).fill(5));
  };

  const handleChildAgeChange = (index: number, age: number) => {
    const newAges = [...childrenAges];
    newAges[index] = age;
    setChildrenAges(newAges);
  };

  const handleCityClick = (city: { name: string; slug: string; countrySlug: string }) => {
    setQuery(city.name);
    setShowSuggestions(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    setCheckin(tomorrow.toISOString().split('T')[0]!);
    setCheckout(dayAfter.toISOString().split('T')[0]!);
    setAdults('2');
    setSearched(false);
    setResults([]);
    setError(null);
  };

  const getOstrovokUrl = (hotel: Hotel) => {
    if (hotel.ostrovokHid) {
      const params = new URLSearchParams();
      if (checkin) params.set('checkin', checkin);
      if (checkout) params.set('checkout', checkout);
      params.set('adults', adults);
      if (childrenCount !== '0') params.set('children', childrenCount);
      return `https://www.ostrovok.ru/hotel/${hotel.ostrovokHid}?${params.toString()}`;
    }
    return `https://www.ostrovok.ru`;
  };

  return (
    <>
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Город, отель или страна"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
              />

              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto"
                >
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <span className="text-2xl">
                        {suggestion.type === 'city' ? '🏙️' : '🏨'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{suggestion.text}</div>
                        {suggestion.type === 'hotel' && suggestion.city && (
                          <div className="text-xs text-gray-500">{suggestion.city}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 uppercase">
                        {suggestion.type === 'city' ? 'Город' : 'Отель'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Заезд</label>
                <input
                  type="date"
                  value={checkin}
                  onChange={(e) => setCheckin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Выезд</label>
                <input
                  type="date"
                  value={checkout}
                  onChange={(e) => setCheckout(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Взрослые</label>
                <select
                  value={adults}
                  onChange={(e) => setAdults(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Дети</label>
              <select
                value={childrenCount}
                onChange={(e) => handleChildrenCountChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {childrenCount !== '0' && childrenAges.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {childrenAges.map((age, index) => (
                  <div key={index}>
                    <label className="block text-xs text-slate-500 mb-1">Возраст ребёнка {index + 1}</label>
                    <select
                      value={age}
                      onChange={(e) => handleChildAgeChange(index, parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 18 }, (_, i) => i).map((a) => (
                        <option key={a} value={a}>
                          {a} {a === 0 ? '(до года)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

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

      <div className="max-w-3xl mx-auto mb-8">
        <p className="text-xs text-slate-500 mb-2">Популярные направления:</p>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <button
              key={city.slug}
              type="button"
              onClick={() => handleCityClick(city)}
              className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">
          {error}
        </div>
      )}

      {searched && results.length === 0 && !loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-slate-500 text-lg">Отели не найдены. Попробуйте изменить запрос.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((hotel) => (
            <div key={hotel.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
              <div className="relative w-full h-64 bg-slate-100 overflow-hidden">
                {hotel.images?.[0]?.medium ? (
                  <img src={hotel.images[0].medium} alt={hotel.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">Нет фото</div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: hotel.stars || 0 }).map((_, i) => (
                    <span key={i} className="text-amber-500 text-sm">★</span>
                  ))}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">{hotel.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{hotel.city}, {hotel.country}</p>
                <a
                  href={getOstrovokUrl(hotel)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors text-center"
                >
                  Забронировать
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}


