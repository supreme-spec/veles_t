import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OSTROVOK_BASE_URL = 'https://api.ostrovok.ru/api';

const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

export interface OstrovokConfig {
  apiKey: string;
  dKey: string;
  isTest?: boolean;
}

export class OstrovokClient {
  private client: ReturnType<typeof axios.create>;
  private config: OstrovokConfig;

  constructor(config?: Partial<OstrovokConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.OSTROVOK_API_KEY || '',
      dKey: config?.dKey || process.env.OSTROVOK_D_KEY || '',
      isTest: config?.isTest ?? process.env.OSTROVOK_IS_TEST === 'true',
    };

    if (!this.config.apiKey || !this.config.dKey) {
      console.warn('[OSTROVOK] Missing API credentials in .env.local');
    }

    this.client = axios.create({
      baseURL: OSTROVOK_BASE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'VelesVoyage/1.0 (+https://veles-voyage.ru)',
        'Authorization': `Basic ${Buffer.from(`${this.config.dKey}:${this.config.apiKey}`).toString('base64')}`,
      },
    });

    this.client.interceptors.request.use((config) => {
      if (config.data) {
        config.data = toSnakeCase(config.data);
      }
      return config;
    });
  }

  async testConnection() {
    try {
      const response = await this.client.post('/b2b/v3/hotel/info/', {
        hid: 8526976,
        language: 'ru',
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  }

  async getHotelDump() {
    const response = await this.client.post('/b2b/v3/hotel/info/dump/', {
      language: 'ru',
    });
    return response.data;
  }

  async getIncrementalDump() {
    const response = await this.client.post('/b2b/v3/hotel/info/incremental_dump/', {
      language: 'ru',
    });
    return response.data;
  }

  async getRegionsDump() {
    const response = await this.client.post('/b2b/v3/hotel/region/dump/', {
      language: 'ru',
    });
    return response.data;
  }

  async getHotelContent(hid: number, timeout?: number) {
    const response = await this.client.post('/b2b/v3/hotel/info/', {
      hid,
      language: 'ru',
    }, timeout ? { timeout } : undefined);
    return response.data;
  }

  async searchByRegion(params: {
    regionId: number;
    checkin: string;
    checkout: string;
    guests: Array<{ adults: number; children?: number[] }>;
    residency?: string;
  }) {
    const response = await this.client.post('/b2b/v3/search/serp/region/', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async searchByGeo(params: {
    lat: number;
    lon: number;
    radius: number;
    checkin: string;
    checkout: string;
    guests: Array<{ adults: number; children?: number[] }>;
    residency?: string;
  }) {
    const response = await this.client.post('/b2b/v3/search/serp/geo/', {
      latitude: params.lat,
      longitude: params.lon,
      radius: params.radius,
      checkin: params.checkin,
      checkout: params.checkout,
      guests: params.guests,
      residency: params.residency,
      language: 'ru',
    });
    return response.data;
  }

  async searchByHotelIds(params: {
    hotelIds: string[];
    checkin: string;
    checkout: string;
    guests: Array<{ adults: number; children?: number[] }>;
    residency?: string;
    timeout?: number;
  }) {
    const response = await this.client.post('/b2b/v3/search/serp/hotels/', {
      hids: params.hotelIds.map(id => Number(id)),
      checkin: params.checkin,
      checkout: params.checkout,
      guests: params.guests,
      residency: params.residency,
      language: 'ru',
    }, params.timeout ? { timeout: params.timeout } : undefined);
    return response.data;
  }

  async getHotelpage(params: {
    hid: number;
    checkin: string;
    checkout: string;
    guests: Array<{ adults: number; children?: number[] }>;
    residency?: string;
    timeout?: number;
  }) {
    const response = await this.client.post('/b2b/v3/search/hp/', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async getRateInfo(params: { matchHash: string; searchHash?: string }) {
    const response = await this.client.post('/b2b/v3/hotel/rate/info/', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async prebook(params: { bookHash: string; priceIncreasePercent?: number }) {
    const response = await this.client.post('/b2b/v3/hotel/prebook', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async prebookFromSearch(params: { searchHash: string; priceIncreasePercent?: number }) {
    const response = await this.client.post('/b2b/v3/serp/prebook/', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async createBookingProcess(params: any) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/form/', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async startBookingProcess(params: any) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/finish/', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async checkBookingProcess(partnerOrderId: string) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/finish/status/', {
      partnerOrderId,
      language: 'ru',
    });
    return response.data;
  }

  async cancelBooking(partnerOrderId: string) {
    const response = await this.client.post('/b2b/v3/hotel/order/cancel/', {
      partnerOrderId,
      language: 'ru',
    });
    return response.data;
  }

  async createCreditCardToken(params: any) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/card-token/', {
      ...params,
      language: 'ru',
    });
    return response.data;
  }

  async getBookingInfo(partnerOrderId: string) {
    const response = await this.client.post('/b2b/v3/hotel/order/info/', {
      partnerOrderId,
      language: 'ru',
    });
    return response.data;
  }

  getConfig() {
    return { ...this.config };
  }

  getTestHotelHid() {
    return 8526976;
  }
}

export const ostrovokClient = new OstrovokClient();
