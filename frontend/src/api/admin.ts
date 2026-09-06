import { apiClient } from './client';
import type {
  FlightResponse,
  FlightCreateRequest,
  FlightUpdateRequest,
  FlightCancelRequest,
  FlightStatus
} from '../types';

export interface ListFlightsParams {
  status?: FlightStatus | null;
  origin?: string | null;
  destination?: string | null;
}

export const adminApi = {
  listFlights: async (params?: ListFlightsParams): Promise<FlightResponse[]> => {
    const res = await apiClient.get<FlightResponse[]>('/admin/flights', {
      params: {
        status: params?.status || undefined,
        origin: params?.origin ? params.origin.toUpperCase() : undefined,
        destination: params?.destination ? params.destination.toUpperCase() : undefined,
      },
    });
    return res.data;
  },

  getFlight: async (flightId: string): Promise<FlightResponse> => {
    const res = await apiClient.get<FlightResponse>(`/admin/flights/${flightId}`);
    return res.data;
  },

  createFlight: async (payload: FlightCreateRequest, idempotencyKey?: string): Promise<FlightResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<FlightResponse>('/admin/flights', payload, { headers });
    return res.data;
  },

  updateFlight: async (flightId: string, payload: FlightUpdateRequest): Promise<FlightResponse> => {
    const res = await apiClient.put<FlightResponse>(`/admin/flights/${flightId}`, payload);
    return res.data;
  },

  updateFlightSchedule: async (flightId: string, payload: FlightUpdateRequest): Promise<FlightResponse> => {
    const res = await apiClient.put<FlightResponse>(`/admin/flights/${flightId}/schedule`, payload);
    return res.data;
  },

  cancelFlight: async (flightId: string, payload: FlightCancelRequest, idempotencyKey?: string): Promise<FlightResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<FlightResponse>(`/admin/flights/${flightId}/cancel`, payload, { headers });
    return res.data;
  },
};

export const listFlightsApi = adminApi.listFlights;
export const getFlightApi = adminApi.getFlight;
export const createFlightApi = adminApi.createFlight;
export const updateFlightApi = adminApi.updateFlight;
export const updateFlightScheduleApi = adminApi.updateFlightSchedule;
export const cancelFlightApi = adminApi.cancelFlight;

export const getAuditLogsApi = async (params?: { entity_id?: string; actor_id?: string; limit?: number }): Promise<any[]> => {
  try {
    const res = await apiClient.get<any[]>('/admin/audit-logs', { params });
    return res.data;
  } catch {
    return [];
  }
};

export const getAdminDashboardStatsApi = async (): Promise<any> => {
  try {
    const res = await apiClient.get<any>('/admin/stats');
    return res.data;
  } catch {
    return {
      total_flights: 0,
      active_flights: 0,
      total_bookings: 0,
      confirmed_bookings: 0,
      held_bookings: 0,
      total_revenue: 0,
      pending_refunds: 0,
      waitlist_count: 0,
    };
  }
};

export const updateFlightInventoryApi = async (flightId: string, payload: any): Promise<any> => {
  const res = await apiClient.put(`/admin/flights/${flightId}/inventory`, payload);
  return res.data;
};


