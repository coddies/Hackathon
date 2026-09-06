import { apiClient } from './client';

export interface RefundItem {
  id: string;
  booking_id: string;
  passenger_id?: string | null;
  refund_type: string;
  amount: number | string;
  currency: string;
  status: string;
  reason?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface TravelCreditItem {
  id: string;
  booking_id: string;
  user_id?: string | null;
  amount: number | string;
  currency: string;
  expires_at: string;
  is_used: boolean;
  used_at?: string | null;
  created_at: string;
}

export interface BookingRefundsResponse {
  booking_reference: string;
  refunds: RefundItem[];
  travel_credits: TravelCreditItem[];
}

// RefundResponse used in AdminRefundsPage
export interface RefundResponse {
  id: string;
  booking_reference: string;
  passenger_id?: string | null;
  refund_type: string;
  amount: number | string;
  currency: string;
  status: RefundStatus;
  reason?: string | null;
  created_at: string;
  processed_at?: string | null;
  is_escalated?: boolean;
  escalation_score?: number;
  booking?: {
    flight_number?: string;
    origin?: string;
    destination?: string;
  } | null;
  passenger?: {
    name?: string;
    email?: string;
  } | null;
}

export type RefundStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'ESCALATED';
export const RefundStatus = {
  PENDING: 'PENDING' as const,
  COMPLETED: 'COMPLETED' as const,
  FAILED: 'FAILED' as const,
  ESCALATED: 'ESCALATED' as const,
};

export const refundsApi = {
  getByBooking: async (bookingReference: string): Promise<BookingRefundsResponse> => {
    const res = await apiClient.get<BookingRefundsResponse>(`/refunds/${bookingReference}`);
    return res.data;
  },
};

// Named function exports for admin pages
export const getRefundsQueueApi = async (status?: RefundStatus): Promise<RefundResponse[]> => {
  try {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    const res = await apiClient.get<RefundResponse[]>('/admin/refunds', { params });
    return res.data;
  } catch {
    return [];
  }
};

export const processRefundApi = async (
  refundId: string,
  payloadOrAction: 'approve' | 'reject' | { approved: boolean; reason?: string }
): Promise<RefundResponse> => {
  const action = typeof payloadOrAction === 'string'
    ? payloadOrAction
    : payloadOrAction.approved ? 'approve' : 'reject';
  const body = typeof payloadOrAction === 'object' ? payloadOrAction : {};
  const res = await apiClient.post<RefundResponse>(`/admin/refunds/${refundId}/${action}`, body);
  return res.data;
};

