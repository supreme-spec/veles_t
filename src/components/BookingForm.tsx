'use client';

import { useState } from 'react';

interface BookingFormProps {
  hotelHid: number;
  hotelName: string;
}

type BookingStep = 'form' | 'prebook' | 'booking' | 'success' | 'error';

interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function BookingForm({ hotelHid, hotelName }: BookingFormProps) {
  const [step, setStep] = useState<BookingStep>('form');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [rooms, setRooms] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prebookData, setPrebookData] = useState<any>(null);
  const [bookHash, setBookHash] = useState<string | null>(null);
  const [partnerOrderId, setPartnerOrderId] = useState<string | null>(null);
  const [guestData, setGuestData] = useState<GuestData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

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
        setBookHash(data.result.book_hash || data.result.search_hash || `hotel-${hotelHid}-${checkin}-${checkout}`);
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

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookHash) return;

    setLoading(true);
    setError(null);

    try {
      const partnerOrderIdValue = `order-${DateString()}`;
      setPartnerOrderId(partnerOrderIdValue);

      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookHash,
          partnerOrderId: partnerOrderIdValue,
          rooms: Array.from({ length: Number(rooms) }, () => ({
            guests: [
              { adults: Number(adults), children: Number(children) > 0 ? Array.from({ length: Number(children) }, () => 5) : [] },
            ],
          })),
          user: {
            email: guestData.email,
            phone: guestData.phone,
            first_name: guestData.firstName,
            last_name: guestData.lastName,
          },
          partner: {
            partnerOrderId: partnerOrderIdValue,
          },
          language: 'ru',
        }),
      });

      const data = await res.json();
      if (res.ok && data.result?.status === 'ok') {
        setStep('booking');
        await handleStartBooking(partnerOrderIdValue);
      } else {
        setError(data.error || 'Create booking failed');
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

  const handleStartBooking = async (orderId: string) => {
    if (!bookHash) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/booking/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookHash,
          partnerOrderId: orderId,
          rooms: Array.from({ length: Number(rooms) }, () => ({
            guests: [
              { adults: Number(adults), children: Number(children) > 0 ? Array.from({ length: Number(children) }, () => 5) : [] },
            ],
          })),
          user: {
            email: guestData.email,
            phone: guestData.phone,
            first_name: guestData.firstName,
            last_name: guestData.lastName,
          },
          partner: {
            partnerOrderId: orderId,
          },
          paymentType: {
            type: 'hotel',
          },
          language: 'ru',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await pollBookingStatus(orderId);
      } else {
        setError(data.error || 'Start booking failed');
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

  const pollBookingStatus = async (orderId: string) => {
    const maxAttempts = 30;
    const interval = 3000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch('/api/booking/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partnerOrderId: orderId }),
        });
        const data = await res.json();

        if (data.result?.status === 'ok') {
          setStep('success');
          return;
        }

        if (['soldout', 'provider', 'book_limit', 'insufficient_b2b_balance'].includes(data.result?.error)) {
          setError(data.result.error || 'Бронирование не подтверждено');
          setStep('error');
          return;
        }
      } catch (err) {
        console.error('Poll error:', err);
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    setError('Таймаут ожидания подтверждения');
    setStep('error');
  };

  function DateString() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-2">Бронирование подтверждено</h3>
        <p className="text-sm">Ваш заказ в отеле {hotelName} успешно создан. Номер заказа: {partnerOrderId}</p>
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
      <form onSubmit={handleCreateBooking} className="bg-white p-6 border rounded-xl shadow-lg space-y-4">
        <h3 className="text-lg font-bold">Подтверждение бронирования</h3>
        <div className="text-sm text-slate-600 space-y-1">
          <p>Отель: {hotelName}</p>
          <p>Заезд: {checkin}</p>
          <p>Выезд: {checkout}</p>
          <p>Гости: {adults} взр., {children} дет.</p>
          <p>Номеров: {rooms}</p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Имя"
            required
            value={guestData.firstName}
            onChange={(e) => setGuestData({ ...guestData, firstName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <input
            type="text"
            placeholder="Фамилия"
            required
            value={guestData.lastName}
            onChange={(e) => setGuestData({ ...guestData, lastName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={guestData.email}
            onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <input
            type="tel"
            placeholder="Телефон"
            required
            value={guestData.phone}
            onChange={(e) => setGuestData({ ...guestData, phone: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Обработка...' : 'Подтвердить бронь'}
          </button>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Назад
          </button>
        </div>
      </form>
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
