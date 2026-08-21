'use client';

import { useState } from 'react';

interface BookingFormProps {
  hotelHid: number;
  hotelName: string;
  cancellationPolicies?: any;
  taxes?: any[];
  initialBookHash?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  residency?: string;
}

type BookingStep = 'form' | 'prebook' | 'booking' | '3ds' | 'success' | 'error';

interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface RoomData {
  adults: number;
  childrenAges: number[];
}

export function BookingForm({
  hotelHid,
  hotelName,
  cancellationPolicies,
  taxes,
  initialBookHash,
  initialCheckin,
  initialCheckout,
  residency,
}: BookingFormProps) {
  const [step, setStep] = useState<BookingStep>('form');
  const [checkin, setCheckin] = useState(initialCheckin || '');
  const [checkout, setCheckout] = useState(initialCheckout || '');
  const [roomsCount, setRoomsCount] = useState('1');
  const [rooms, setRooms] = useState<RoomData[]>([{ adults: 2, childrenAges: [] }]);
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
  const [threeDsUrl, setThreeDsUrl] = useState<string | null>(null);

  const updateRoom = (index: number, field: keyof RoomData, value: any) => {
    setRooms(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as RoomData;
      return next;
    });
  };

  const addRoom = () => {
    if (rooms.length < 9) {
      setRooms([...rooms, { adults: 2, childrenAges: [] }]);
    }
  };

  const removeRoom = (index: number) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((_, i) => i !== index));
    }
  };

  const handlePrebook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/booking/prebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookHash: initialBookHash || `hotel-${hotelHid}-${checkin}-${checkout}`,
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
      const partnerOrderIdValue = `order-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
      setPartnerOrderId(partnerOrderIdValue);

      const roomsPayload = rooms.map(room => ({
        guests: [
          { adults: room.adults, children: room.childrenAges },
        ],
      }));

      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookHash,
          partnerOrderId: partnerOrderIdValue,
          rooms: roomsPayload,
          user: {
            email: guestData.email,
            phone: guestData.phone,
            first_name: guestData.firstName,
            last_name: guestData.lastName,
          },
          partner: {
            partnerOrderId: partnerOrderIdValue,
          },
          residency: residency || 'RU',
          language: 'ru',
        }),
      });

      const data = await res.json();
      if (res.ok && data.result?.status === 'ok') {
        const finalPartnerOrderId = data.partnerOrderId || partnerOrderIdValue;
        setPartnerOrderId(finalPartnerOrderId);
        setStep('booking');
        await handleStartBooking(finalPartnerOrderId);
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

  const handleStartBooking = async (initialOrderId: string) => {
    if (!bookHash) return;

    setLoading(true);
    setError(null);

    const maxRetries = 10;
    let lastError: any = null;
    let currentOrderId = initialOrderId;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          currentOrderId = `order-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
          setPartnerOrderId(currentOrderId);
        }

        const res = await fetch('/api/booking/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookHash,
            partnerOrderId: currentOrderId,
            rooms: rooms.map(room => ({
              guests: [{ adults: room.adults, children: room.childrenAges }],
            })),
            user: {
              email: guestData.email,
              phone: guestData.phone,
              first_name: guestData.firstName,
              last_name: guestData.lastName,
            },
            partner: { partnerOrderId: currentOrderId },
            residency: residency || 'RU',
            paymentType: { type: 'hotel' },
            language: 'ru',
          }),
        });

        const data = await res.json();
        if (res.ok) {
          if (data.result?.status === '3ds' || data.result?.three_ds_url) {
            setThreeDsUrl(data.result.three_ds_url || data.result.data?.three_ds_url);
            setStep('3ds');
            setLoading(false);
            return;
          }
          await pollBookingStatus(currentOrderId);
          return;
        }

        lastError = data.error;
        const RETRYABLE_ERRORS = ['timeout', 'unknown', 'duplicate_reservation', 'double_booking_form'];
        const isRetryable = (data.status === 'error' &&
          RETRYABLE_ERRORS.some(e => data.error?.includes(e))) ||
          (!res.ok && res.status >= 500);

        if (attempt < maxRetries && isRetryable) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(lastError || 'Start booking failed');
      } catch (err: any) {
        lastError = err.message;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        setError(lastError || 'Start booking failed');
        setStep('error');
        setLoading(false);
        return;
      }
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

        if (data.result?.status === '3ds' || data.result?.three_ds_url) {
          setThreeDsUrl(data.result.three_ds_url || data.result.data?.three_ds_url);
          setStep('3ds');
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

  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-2">Бронирование подтверждено ✅</h3>
        <p className="text-sm">
          Ваш заказ в отеле <strong>{hotelName}</strong> успешно создан.<br/>
          Номер заказа: <code className="bg-white px-2 py-1 rounded">{partnerOrderId}</code>
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={async () => {
              if (!partnerOrderId) return;
              if (!confirm('Вы уверены, что хотите отменить бронирование?')) return;
              setLoading(true);
              try {
                const res = await fetch('/api/booking/cancel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ partnerOrderId }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert('Бронирование успешно отменено');
                  setStep('form');
                } else {
                  alert('Ошибка отмены: ' + (data.error || 'Unknown error'));
                }
              } catch (err) {
                alert('Ошибка сети при отмене');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Отмена...' : 'Отменить бронирование'}
          </button>
        </div>
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 p-2 rounded">
          ⚠️ Для тестовых бронирований обязательно отмените заказ после проверки
        </p>
      </div>
    );
  }

  if (step === '3ds' && threeDsUrl) {
    return (
      <div className="bg-white p-6 border rounded-xl shadow-lg space-y-4">
        <h3 className="text-lg font-bold">Подтверждение платежа</h3>
        <p className="text-sm text-slate-600">Для завершения бронирования необходимо пройти 3DS-аутентификацию.</p>
        <a
          href={threeDsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Перейти к 3DS
        </a>
        <button
          onClick={() => pollBookingStatus(partnerOrderId || '')}
          disabled={loading}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Проверка...' : 'Проверить статус после 3DS'}
        </button>
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
        
        {cancellationPolicies && (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            <p className="font-semibold mb-1">Условия отмены:</p>
            <p>Бесплатная отмена до: {cancellationPolicies.free_cancellation_before ? new Date(cancellationPolicies.free_cancellation_before).toLocaleString('ru-RU') : 'Не указано'}</p>
          </div>
        )}

        {taxes && taxes.length > 0 && (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            <p className="font-semibold mb-1">Налоги и сборы:</p>
            {taxes.filter((t: any) => !t.included_by_supplier).map((tax: any, idx: number) => (
              <p key={idx}>{tax.name}: {tax.amount} {tax.currency_code}</p>
            ))}
          </div>
        )}

        <div className="text-sm text-slate-600 space-y-1">
          <p>Отель: {hotelName}</p>
          <p>Заезд: {checkin}</p>
          <p>Выезд: {checkout}</p>
          <p>Номеров: {roomsCount}</p>
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
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Номеров</label>
        <select
          value={roomsCount}
          onChange={(e) => {
            const count = Number(e.target.value);
            setRoomsCount(e.target.value);
            setRooms(prev => {
              if (count > prev.length) {
                return [...prev, ...Array.from({ length: count - prev.length }, () => ({ adults: 2, childrenAges: [] }))];
              }
              return prev.slice(0, count);
            });
          }}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-700">Состав гостей по номерам:</p>
        {rooms.map((room, idx) => (
          <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold">Номер {idx + 1}</p>
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoom(idx)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Удалить
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Взрослые</label>
                <select
                  value={room.adults}
                  onChange={(e) => updateRoom(idx, 'adults', Number(e.target.value))}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Дети (возраст)</label>
                <select
                  value={room.childrenAges.length}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    updateRoom(idx, 'childrenAges', Array.from({ length: count }, () => 5));
                  }}
                  className="w-full px-2 py-1 rounded border border-slate-200 text-sm"
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {rooms.length < 9 && (
          <button
            type="button"
            onClick={addRoom}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            + Добавить номер
          </button>
        )}
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
