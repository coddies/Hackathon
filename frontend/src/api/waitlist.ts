import { apiClient } from './client';
import type { WaitlistJoinRequest, WaitlistResponse, WaitlistEntryResponse } from '../types';
import { WaitlistStatus } from '../types';

export const waitlistApi = {
  join: async (payload: WaitlistJoinRequest, idempotencyKey?: string): Promise<WaitlistResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<WaitlistResponse>('/waitlist', payload, { headers });
    return res.data;
  },

  getStatus: async (waitlistId: string): Promise<WaitlistEntryResponse> => {
    const res = await apiClient.get<WaitlistEntryResponse>(`/waitlist/${waitlistId}`);
    return res.data;
  },
};

// Named function exports for backward compatibility with pages
export const getWaitlistStatusApi = async (waitlistId: string): Promise<WaitlistEntryResponse> => {
  const res = await apiClient.get<WaitlistEntryResponse>(`/waitlist/${waitlistId}`);
  return res.data;
};

export const joinWaitlistApi = async (payload: WaitlistJoinRequest, idempotencyKey?: string): Promise<WaitlistResponse> => {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await apiClient.post<WaitlistResponse>('/waitlist', payload, { headers });
  return res.data;
};

/** Admin: Get full waitlist queue with optional filters */
export const getWaitlistQueueApi = async (
  flightId?: string,
  status?: WaitlistStatus
): Promise<WaitlistEntryResponse[]> => {
  try {
    const params: Record<string, string> = {};
    if (flightId) params['flight_id'] = flightId;
    if (status) params['status'] = status;
    const res = await apiClient.get<WaitlistEntryResponse[]>('/waitlist', { params });
    return res.data;
  } catch {
    return [];
  }
};
