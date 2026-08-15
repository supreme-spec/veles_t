import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OSTROVOK_BASE_URL = 'https://api.ostrovok.ru/api';

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
        'Authorization': `Basic ${Buffer.from(`${this.config.dKey}:${this.config.apiKey}`).toString('base64')}`,
      },
    });
  }

  async testConnection() {
    try {
      const response = await this.client.get('/b2b/v3/hotel/info/', {
        params: { hid: 8526976 },
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

  async getHotelContent(hid: number) {
    const response = await this.client.get('/b2b/v3/hotel/info/', {
      params: { hid },
    });
    return response.data;
  }

  async searchByRegion(params: {
    regionId: number;
    checkin: string;
    checkout: string;
    guests: Array<{ adults: number; children?: number[] }>;
    residency?: string;
  }) {
    const response = await this.client.post('/b2b/v3/search/serp/region/', params);
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
    const response = await this.client.post('/b2b/v3/search/serp/geo/', params);
    return response.data;
  }

  async searchByHotelIds(params: {
    hotelIds: string[];
    checkin: string;
    checkout: string;
    guests: Array<{ adults: number; children?: number[] }>;
    residency?: string;
  }) {
    const response = await this.client.post('/b2b/v3/search/serp/phone/', params);
    return response.data;
  }

  async getHotelpage(params: {
    hid: number;
    checkin: string;
    checkout: string;
    guests: Array<{ adults: number; children?: number[] }>;
    residency?: string;
  }) {
    const response = await this.client.post('/b2b/v3/search/hp/', params);
    return response.data;
  }

  async prebook(params: { bookHash: string; priceIncreasePercent?: number }) {
    const response = await this.client.post('/b2b/v3/hotel/prebook', params);
    return response.data;
  }

  async createBookingProcess(params: any) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/form/', params);
    return response.data;
  }

  async startBookingProcess(params: any) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/finish/', params);
    return response.data;
  }

  async checkBookingProcess(partnerOrderId: string) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/finish/status/', {
      partnerOrderId,
    });
    return response.data;
  }

  async cancelBooking(partnerOrderId: string) {
    const response = await this.client.post('/b2b/v3/hotel/order/cancel/', {
      partnerOrderId,
    });
    return response.data;
  }

  async createCreditCardToken(params: any) {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/card-token/', params);
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
