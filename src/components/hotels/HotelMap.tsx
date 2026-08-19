'use client';

import { useMemo, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export interface HotelMapPoint {
  id: string;
  name: string;
  city: string;
  country: string;
  stars?: number | null;
  minPrice?: number | null;
  lng: number;
  lat: number;
}

interface HotelMapProps {
  hotels: HotelMapPoint[];
  selectedHotelId?: string | null;
  onSelectHotel?: (hotelId: string) => void;
}

export function HotelMap({ hotels, selectedHotelId, onSelectHotel }: HotelMapProps) {
  const mapRef = useRef<any>(null);

  const bounds = useMemo(() => {
    if (!hotels.length) return undefined;
    const lngs = hotels.map((h) => h.lng);
    const lats = hotels.map((h) => h.lat);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [number, number, number, number];
  }, [hotels]);

  const center = useMemo(() => {
    if (hotels.length === 1) {
      return { lng: hotels[0].lng, lat: hotels[0].lat };
    }
    if (hotels.length > 1) {
      return {
        lng: hotels.reduce((sum, h) => sum + h.lng, 0) / hotels.length,
        lat: hotels.reduce((sum, h) => sum + h.lat, 0) / hotels.length,
      };
    }
    return { lng: 37.6173, lat: 55.7558 };
  }, [hotels]);

  return (
    <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-slate-200">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        center={[center.lng, center.lat]}
        zoom={hotels.length > 1 ? 4 : 12}
        maxZoom={16}
        interactiveLayerIds={[]}
        onClick={() => onSelectHotel?.(null)}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {hotels.map((hotel) => (
          <Marker
            key={hotel.id}
            longitude={hotel.lng}
            latitude={hotel.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectHotel?.(hotel.id);
            }}
          >
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-lg border ${
                selectedHotelId === hotel.id
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-slate-900 border-slate-200'
              }`}
            >
              {hotel.stars ? '★'.repeat(hotel.stars) : '🏨'}
            </div>
          </Marker>
        ))}

        {selectedHotelId && (() => {
          const selected = hotels.find((h) => h.id === selectedHotelId);
          if (!selected) return null;
          return (
            <Popup
              longitude={selected.lng}
              latitude={selected.lat}
              anchor="top"
              closeButton
              closeOnClick={false}
              onClose={() => onSelectHotel?.(null)}
            >
              <div className="p-2">
                <h3 className="font-bold text-slate-900">{selected.name}</h3>
                <p className="text-xs text-slate-500">{selected.city}, {selected.country}</p>
                {selected.minPrice != null && (
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {Number(selected.minPrice).toLocaleString('ru-RU')} ₽
                  </p>
                )}
              </div>
            </Popup>
          );
        })()}
      </Map>
    </div>
  );
}
