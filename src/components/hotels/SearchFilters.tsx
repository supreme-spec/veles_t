'use client';

import { useState, useMemo } from 'react';

export interface Filters {
  priceRange: [number, number];
  stars: number[];
  amenities: string[];
  freeCancellation: boolean;
}

interface SearchFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const AMENITY_OPTIONS = [
  'Wi-Fi',
  'Бассейн',
  'Парковка',
  'Ресторан',
  'Фитнес',
  'Спа',
  'Завтрак',
  'Трансфер',
  'Пляж',
  'Конференц-зал',
];

export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const toggleArrayValue = (key: 'stars' | 'amenities', value: number | string) => {
    const current = filters[key];
    const next = current.includes(value as any)
      ? current.filter((v) => v !== value)
      : [...current, value as any];
    onChange({ ...filters, [key]: next });
  };

  const priceFrom = useMemo(
    () =>
      filters.priceRange[0] > 0
        ? filters.priceRange[0].toLocaleString('ru-RU')
        : '',
    [filters.priceRange[0]]
  );
  const priceTo = useMemo(
    () =>
      filters.priceRange[1] < 200000
        ? filters.priceRange[1].toLocaleString('ru-RU')
        : '',
    [filters.priceRange[1]]
  );

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">Цена за ночь, ₽</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="От"
            value={priceFrom}
            onChange={(e) =>
              onChange({
                ...filters,
                priceRange: [Number(e.target.value) || 0, filters.priceRange[1]],
              })
            }
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <span className="text-slate-400">—</span>
          <input
            type="number"
            placeholder="До"
            value={priceTo}
            onChange={(e) =>
              onChange({
                ...filters,
                priceRange: [filters.priceRange[0], Number(e.target.value) || 200000],
              })
            }
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">Категория</label>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4, 5].map((stars) => (
            <button
              key={stars}
              type="button"
              onClick={() => toggleArrayValue('stars', stars)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                filters.stars.includes(stars)
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              {stars}★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">Удобства</label>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {AMENITY_OPTIONS.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={filters.amenities.includes(amenity)}
                onChange={() => toggleArrayValue('amenities', amenity)}
                className="rounded border-slate-300"
              />
              <span className="text-slate-700">{amenity}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.freeCancellation}
          onChange={(e) => onChange({ ...filters, freeCancellation: e.target.checked })}
          className="rounded border-slate-300"
        />
        <span className="text-sm font-semibold text-slate-900">Только с бесплатной отменой</span>
      </label>
    </div>
  );
}
