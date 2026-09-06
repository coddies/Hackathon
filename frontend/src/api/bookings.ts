import { apiClient } from './client';
import type {
  SeatHoldRequest,
  SeatHoldResponse,
  BookingConfirmRequest,
  BookingResponse,
  BookingCancelRequest,
  BookingCancelResponse
} from '../types';

export const bookingsApi = {
  createHold: async (payload: SeatHoldRequest, idempotencyKey?: string): Promise<SeatHoldResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<SeatHoldResponse>('/bookings/hold', payload, { headers });
    return res.data;
  },

  releaseHold: async (holdId: string, idempotencyKey?: string): Promise<{ message?: string }> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post(`/bookings/hold/${holdId}/release`, {}, { headers });
    return res.data;
  },

  confirmBooking: async (payload: BookingConfirmRequest, idempotencyKey?: string): Promise<BookingResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<BookingResponse>('/bookings', payload, { headers });
    return res.data;
  },

  getBooking: async (bookingReference: string): Promise<BookingResponse> => {
    const res = await apiClient.get<BookingResponse>(`/bookings/${bookingReference}`);
    return res.data;
  },

  getPassengerBookings: async (): Promise<BookingResponse[]> => {
    const res = await apiClient.get<BookingResponse[]>('/bookings/my');
    return res.data;
  },

  cancelBooking: async (
    bookingReference: string,
    payload: BookingCancelRequest,
    idempotencyKey?: string
  ): Promise<BookingCancelResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<BookingCancelResponse>(
      `/bookings/${bookingReference}/cancel`,
      payload,
      { headers }
    );
    return res.data;
  },
};

// Named function exports for backward compatibility with pages
export const getPassengerBookingsApi = async (): Promise<BookingResponse[]> => {
  try {
    const res = await apiClient.get<BookingResponse[]>('/bookings/my');
    return res.data;
  } catch {
    return [];
  }
};

export const getBookingByReferenceApi = async (reference: string): Promise<BookingResponse> => {
  const res = await apiClient.get<BookingResponse>(`/bookings/${reference}`);
  return res.data;
};

export const cancelBookingApi = bookingsApi.cancelBooking;

export const getBookingsListApi = async (params?: { flight_id?: string; status?: string }): Promise<BookingResponse[]> => {
  try {
    const res = await apiClient.get<BookingResponse[]>('/admin/bookings', { params });
    return res.data;
  } catch {
    return [];
  }
};


