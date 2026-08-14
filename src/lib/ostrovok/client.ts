import axios, { AxiosInstance } from 'axios';
import type {
  OstrovokConfig,
  SearchByRegionParams,
  SearchByGeoParams,
  SearchByHotelIdsParams,
  HotelpageParams,
  PrebookParams,
  CreateBookingParams,
  StartBookingParams,
  CreditCardTokenParams,
  DumpResponse,
  OstrovokApiResponse,
  PrebookResult,
  CreateBookingResult,
  CheckBookingResult,
} from './types';

const OSTROVOK_API_BASE = 'https://api.ostrovok.ru/api';
const TEST_HOTEL_HID = 8526976;

export class OstrovokClient {
  private client: AxiosInstance;
  private config: OstrovokConfig;

  constructor(config: OstrovokConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: OSTROVOK_API_BASE,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.dKey}:${config.apiKey}`).toString('base64')}`,
      },
    });
  }

  async getHotelDump(): Promise<DumpResponse> {
    const response = await this.client.get('/b2b/v3/hotel/info/dump/');
    return response.data;
  }

  async getHotelIncrementalDump(): Promise<DumpResponse> {
    const response = await this.client.get('/b2b/v3/hotel/info/incremental_dump/');
    return response.data;
  }

  async getRegionsDump(): Promise<DumpResponse> {
    const response = await this.client.get('/b2b/v3/regions/dump/');
    return response.data;
  }

  async getHotelContent(hid: number): Promise<any> {
    const response = await this.client.get('/b2b/v3/hotel/info/', {
      params: { hid },
    });
    return response.data;
  }

  async searchByRegion(params: SearchByRegionParams): Promise<OstrovokApiResponse<{ results: any[] }>> {
    const response = await this.client.post('/b2b/v3/search/serp/region/', params);
    return response.data;
  }

  async searchByGeo(params: SearchByGeoParams): Promise<OstrovokApiResponse<{ results: any[] }>> {
    const response = await this.client.post('/b2b/v3/search/serp/geo/', params);
    return response.data;
  }

  async searchByHotelIds(params: SearchByHotelIdsParams): Promise<OstrovokApiResponse<{ results: any[] }>> {
    const response = await this.client.post('/b2b/v3/search/serp/hotels/', params);
    return response.data;
  }

  async getHotelpage(params: HotelpageParams): Promise<OstrovokApiResponse<{ results: any[] }>> {
    const response = await this.client.post('/b2b/v3/search/hp/', params);
    return response.data;
  }

  async prebookFromHotelpage(params: PrebookParams): Promise<OstrovokApiResponse<PrebookResult>> {
    const response = await this.client.post('/b2b/v3/hotel/prebook', params);
    return response.data;
  }

  async prebookFromSearch(params: PrebookParams): Promise<OstrovokApiResponse<PrebookResult>> {
    const response = await this.client.post('/b2b/v3/serp/prebook/', params);
    return response.data;
  }

  async createCreditCardToken(params: CreditCardTokenParams): Promise<OstrovokApiResponse<any>> {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/card-token/', params);
    return response.data;
  }

  async createBookingProcess(params: CreateBookingParams): Promise<OstrovokApiResponse<CreateBookingResult>> {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/form/', params);
    return response.data;
  }

  async startBookingProcess(params: StartBookingParams): Promise<OstrovokApiResponse<any>> {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/finish/', params);
    return response.data;
  }

  async checkBookingProcess(partnerOrderId: string): Promise<OstrovokApiResponse<CheckBookingResult>> {
    const response = await this.client.post('/b2b/v3/hotel/order/booking/finish/status/', {
      partnerOrderId,
    });
    return response.data;
  }

  async cancelBooking(partnerOrderId: string): Promise<OstrovokApiResponse<any>> {
    const response = await this.client.post('/b2b/v3/hotel/order/cancel/', {
      partnerOrderId,
    });
    return response.data;
  }

  async getBookingInfo(partnerOrderId: string): Promise<OstrovokApiResponse<any>> {
    const response = await this.client.post('/b2b/v3/hotel/order/info/', {
      partnerOrderId,
    });
    return response.data;
  }

  isTestHotel(hid: number): boolean {
    return hid === TEST_HOTEL_HID;
  }

  getTestHotelHid(): number {
    return TEST_HOTEL_HID;
  }
}

export const ostrovokClient = new OstrovokClient({
  apiKey: process.env.OSTROVOK_API_KEY || '',
  dKey: process.env.OSTROVOK_D_KEY || '',
  isTest: process.env.OSTROVOK_IS_TEST === 'true',
});
