import { apiClient } from './client';
import type { FlightSearchResponse, SeatMapResponse, FlightDetailResponse, FlightListItem } from '../types';

export interface SearchFlightsParams {
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: number;
  currency?: string;
  locale?: string;
}

export const flightsApi = {
  search: async (params: SearchFlightsParams): Promise<FlightSearchResponse[]> => {
    const res = await apiClient.get<FlightSearchResponse[]>('/flights/search', {
      params: {
        ...(params.origin ? { origin: params.origin.toUpperCase() } : {}),
        ...(params.destination ? { destination: params.destination.toUpperCase() } : {}),
        ...(params.date ? { date: params.date } : {}),
        passengers: params.passengers || 1,
        currency: params.currency || 'USD',
        locale: params.locale || 'en-US',
      },
    });
    return res.data;
  },

  getSeatMap: async (flightId: string): Promise<SeatMapResponse> => {
    const res = await apiClient.get<SeatMapResponse>(`/flights/${flightId}/seat-map`);
    return res.data;
  },

  getById: async (flightId: string): Promise<FlightDetailResponse> => {
    const res = await apiClient.get<FlightDetailResponse>(`/flights/${flightId}`);
    return res.data;
  },
};

// Named function exports for backward compatibility with pages
export const searchFlightsApi = async (params: SearchFlightsParams): Promise<FlightListItem[]> => {
  const res = await apiClient.get<FlightListItem[]>('/flights/search', {
    params: {
      ...(params.origin ? { origin: params.origin.toUpperCase() } : {}),
      ...(params.destination ? { destination: params.destination.toUpperCase() } : {}),
      ...(params.date ? { date: params.date } : {}),
      passengers: params.passengers || 1,
      currency: params.currency || 'USD',
    },
  });
  return res.data;
};

export const getFlightByIdApi = async (flightId: string): Promise<FlightDetailResponse> => {
  const res = await apiClient.get<FlightDetailResponse>(`/flights/${flightId}`);
  return res.data;
};

export const getSeatMapApi = async (flightId: string): Promise<SeatMapResponse> => {
  const res = await apiClient.get<SeatMapResponse>(`/flights/${flightId}/seat-map`);
  return res.data;
};
