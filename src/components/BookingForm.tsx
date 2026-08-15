'use client';

import { useState } from 'react';

interface BookingFormProps {
  hotelHid: number;
  hotelName: string;
}

export function BookingForm({ hotelHid, hotelName }: BookingFormProps) {
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [rooms, setRooms] = useState('1');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'prebook' | 'success' | 'error'>('form');
  const [error, setError] = useState<string | null>(null);
  const [prebookData, setPrebookData] = useState<any>(null);

  const handlePrebook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/booking/prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookHash: `hotel-${hotelHid}-${checkin}-${checkout}`,
          priceIncreasePercent: 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setPrebookData(data.result);
        setStep('prebook');
      } else {
        setError(data.error || 'Prebook failed');
        setStep('error');
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка сети');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookHash: prebookData?.book_hash || `hotel-${hotelHid}-${checkin}-${checkout}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('success');
      } else {
        setError(data.error || 'Booking failed');
        setStep('error');
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка сети');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-2">Бронирование подтверждено</h3>
        <p className="text-sm">Ваш заказ в отеле {hotelName} успешно создан.</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-2">Ошибка бронирования</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => setStep('form')}
          className="mt-4 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm px-4 py-2 rounded-xl"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (step === 'prebook' && prebookData) {
    return (
      <div className="bg-white p-6 border rounded-xl shadow-lg space-y-4">
        <h3 className="text-lg font-bold">Подтверждение бронирования</h3>
        <div className="text-sm text-slate-600 space-y-1">
          <p>Отель: {hotelName}</p>
          <p>Заезд: {checkin}</p>
          <p>Выезд: {checkout}</p>
          <p>Гости: {adults} взр., {children} дет.</p>
          <p>Номеров: {rooms}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Обработка...' : 'Подтвердить бронь'}
          </button>
          <button
            onClick={() => setStep('form')}
            className="px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePrebook} className="bg-white p-6 border rounded-xl shadow-lg space-y-4">
      <h3 className="text-lg font-bold">Бронирование номеров</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Заезд</label>
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Выезд</label>
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Взрослые</label>
          <select
            value={adults}
            onChange={(e) => setAdults(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Дети</label>
          <select
            value={children}
            onChange={(e) => setChildren(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Номеров</label>
        <select
          value={rooms}
          onChange={(e) => setRooms(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
      >
        {loading ? 'Обработка...' : 'Забронировать'}
      </button>
    </form>
  );
}
