// Type definitions matching OpenAPI schema exactly

export type UserRole = 'SUPER_ADMIN' | 'OPS_AGENT' | 'PASSENGER';

// Enum-like const objects so they can be used as values (e.g. SeatClass.ECONOMY)
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN' as const,
  OPS_AGENT: 'OPS_AGENT' as const,
  PASSENGER: 'PASSENGER' as const,
};

export type FlightStatus = 'SCHEDULED' | 'DELAYED' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';
export const FlightStatus = {
  SCHEDULED: 'SCHEDULED' as const,
  DELAYED: 'DELAYED' as const,
  DEPARTED: 'DEPARTED' as const,
  ARRIVED: 'ARRIVED' as const,
  CANCELLED: 'CANCELLED' as const,
};

export type SeatClass = 'FIRST' | 'BUSINESS' | 'ECONOMY';
export const SeatClass = {
  FIRST: 'FIRST' as const,
  BUSINESS: 'BUSINESS' as const,
  ECONOMY: 'ECONOMY' as const,
};

export type FareType = 'BASIC' | 'FLEXIBLE';
export const FareType = {
  BASIC: 'BASIC' as const,
  FLEXIBLE: 'FLEXIBLE' as const,
};

export type OverbookingPolicy = 'HARD_NEVER_OVERSELL' | 'BUFFER_ALLOWED';
export const OverbookingPolicy = {
  HARD_NEVER_OVERSELL: 'HARD_NEVER_OVERSELL' as const,
  BUFFER_ALLOWED: 'BUFFER_ALLOWED' as const,
};

export type GroupBookingPolicy = 'FULL_FAIL' | 'PARTIAL_HOLD' | 'WAITLIST';
export const GroupBookingPolicy = {
  FULL_FAIL: 'FULL_FAIL' as const,
  PARTIAL_HOLD: 'PARTIAL_HOLD' as const,
  WAITLIST: 'WAITLIST' as const,
};

export type HoldStatus = 'HELD' | 'EXPIRED' | 'CONFIRMED' | 'RELEASED';
export const HoldStatus = {
  HELD: 'HELD' as const,
  EXPIRED: 'EXPIRED' as const,
  CONFIRMED: 'CONFIRMED' as const,
  RELEASED: 'RELEASED' as const,
};

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'REBOOKING_PENDING' | 'HELD';
export const BookingStatus = {
  CONFIRMED: 'CONFIRMED' as const,
  CANCELLED: 'CANCELLED' as const,
  REBOOKING_PENDING: 'REBOOKING_PENDING' as const,
  HELD: 'HELD' as const,
};

export type CancellationPolicy = 'REFUNDABLE' | 'CREDIT_ONLY' | 'NON_REFUNDABLE';
export const CancellationPolicy = {
  REFUNDABLE: 'REFUNDABLE' as const,
  CREDIT_ONLY: 'CREDIT_ONLY' as const,
  NON_REFUNDABLE: 'NON_REFUNDABLE' as const,
};

export type FlightCancellationOutcome = 'REFUND' | 'REBOOK' | 'TRAVEL_CREDIT';
export const FlightCancellationOutcome = {
  REFUND: 'REFUND' as const,
  REBOOK: 'REBOOK' as const,
  TRAVEL_CREDIT: 'TRAVEL_CREDIT' as const,
};

export type PassengerStatus = 'CONFIRMED' | 'CANCELLED';
export const PassengerStatus = {
  CONFIRMED: 'CONFIRMED' as const,
  CANCELLED: 'CANCELLED' as const,
};

export type WaitlistStatus = 'WAITING' | 'PROMOTED' | 'EXPIRED' | 'CANCELLED';
export const WaitlistStatus = {
  WAITING: 'WAITING' as const,
  PROMOTED: 'PROMOTED' as const,
  EXPIRED: 'EXPIRED' as const,
  CANCELLED: 'CANCELLED' as const,
};

export type LoyaltyTier = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'STANDARD';
export const LoyaltyTier = {
  NONE: 'NONE' as const,
  BRONZE: 'BRONZE' as const,
  SILVER: 'SILVER' as const,
  GOLD: 'GOLD' as const,
  PLATINUM: 'PLATINUM' as const,
  STANDARD: 'NONE' as const,
};

export type RefundType = 'CASH' | 'TRAVEL_CREDIT' | 'NONE';

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface SeatClassInput {
  seat_class: SeatClass;
  total_seats: number;
  fare_basic: number;
  fare_flexible: number;
  overbooking_policy?: OverbookingPolicy;
  overbooking_buffer?: number;
  booking_cutoff_hours?: number;
  group_booking_policy?: GroupBookingPolicy;
}

export interface SeatInventoryResponse {
  id: string;
  flight_id: string;
  seat_class: SeatClass;
  total_seats: number;
  available_seats: number;
  held_seats: number;
  overbooking_policy: OverbookingPolicy;
  overbooking_buffer: number;
  fare_basic: string | number;
  fare_flexible: string | number;
  booking_cutoff_hours: number;
  group_booking_policy: GroupBookingPolicy;
}

export interface FlightResponse {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  aircraft_capacity: number;
  status: FlightStatus;
  seat_inventory: SeatInventoryResponse[];
  created_at: string;
}

export interface FlightSearchResponse {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  status: FlightStatus;
  available_classes: SeatInventoryResponse[];
  currency?: string;
  locale?: string;
}

export interface FlightSeatResponse {
  id: string;
  seat_number: string;
  seat_class: SeatClass;
  is_available: boolean;
  status?: SeatStatus;
  hold_id?: string | null;
  passenger_id?: string | null;
}

export interface SeatMapResponse {
  flight_id: string;
  flight_number: string;
  seat_classes: Record<string, FlightSeatResponse[]>;
}

export interface SeatHoldRequest {
  flight_id: string;
  seat_class: SeatClass;
  passenger_count: number;
  fare_type: FareType;
  seat_number?: string | null;
  itinerary_id?: string | null;
}

export interface SeatHoldResponse {
  id: string;
  flight_id: string;
  seat_class: SeatClass;
  fare_type: FareType;
  passenger_count: number;
  status: HoldStatus;
  hold_started_at: string;
  hold_expires_at: string;
  itinerary_id?: string | null;
}

export interface PassengerInput {
  name: string;
  email: string;
  passport_number?: string | null;
  date_of_birth?: string | null;
  seat_number?: string | null;
}

export interface PassengerResponse {
  id: string;
  name: string;
  email: string;
  status: PassengerStatus;
  seat_number?: string | null;
  cancelled_at?: string | null;
  refund_amount?: string | number | null;
}

export interface BookingConfirmRequest {
  hold_id: string;
  passengers: PassengerInput[];
  cancellation_policy: CancellationPolicy;
  currency?: string;
}

export interface BookingResponse {
  id: string;
  booking_reference: string;
  flight_id: string;
  seat_class: SeatClass;
  fare_type: FareType;
  total_amount: string | number;
  // Alias for total_amount for backward compat
  total_price?: string | number;
  currency: string;
  status: BookingStatus;
  cancellation_policy: CancellationPolicy;
  hold_id: string;
  itinerary_id?: string | null;
  airline_initiated: boolean;
  flight_cancellation_outcome?: FlightCancellationOutcome | null;
  passengers: PassengerResponse[];
  created_at: string;
  cancelled_at?: string | null;
  // Optionally populated flight details
  flight?: {
    flight_number: string;
    origin: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
  } | null;
}

export interface BookingCancelRequest {
  passenger_ids?: string[] | null;
  reason?: string | null;
}

export interface BookingCancelResponse {
  booking_reference: string;
  cancelled_passengers: string[];
  refund_type: RefundType;
  refund_amount: string | number;
  credit_expires_at?: string | null;
  message: string;
}

export interface WaitlistJoinRequest {
  flight_id: string;
  seat_class: SeatClass;
  passenger_name: string;
  email: string;
  loyalty_tier?: LoyaltyTier;
  fare_type: FareType;
}

export interface WaitlistResponse {
  id: string;
  flight_id: string;
  seat_class: SeatClass;
  passenger_name: string;
  email: string;
  loyalty_tier: LoyaltyTier;
  fare_type: FareType;
  status: WaitlistStatus;
  priority_score: number;
  loyalty_rank: number;
  fare_type_rank: number;
  position: number;
  created_at: string;
}

export interface FlightCreateRequest {
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  aircraft_capacity: number;
  seat_classes: SeatClassInput[];
}

export interface FlightUpdateRequest {
  origin?: string | null;
  destination?: string | null;
  departure_at?: string | null;
  arrival_at?: string | null;
  departure_time?: string | null;
  arrival_time?: string | null;
  reason?: string | null;
  notify_passengers?: boolean;
  seat_classes?: SeatClassInput[] | null;
  rebooking_rule?: string;
  fare_policy_override?: boolean;
  override_reason?: string | null;
}

export interface FlightCancelRequest {
  reason?: string | null;
}

// FlightListItem - simplified view used in search results
export interface FlightListItem {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  departure_time?: string;
  arrival_time?: string;
  capacity?: number;
  status: FlightStatus;
  available_classes: SeatInventoryResponse[];
  currency?: string;
}

// FlightDetailResponse - full detail view used in flight detail page
export interface SeatInventoryDetail {
  id: string;
  seat_class: SeatClass;
  total_seats: number;
  available_seats: number;
  held_seats: number;
  overbooking_policy: OverbookingPolicy;
  overbooking_buffer: number;
  basic_fare_price: number;
  flexible_fare_price: number;
  booking_cutoff_hours: number;
  group_booking_policy: GroupBookingPolicy;
}

export interface FlightDetailResponse {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  capacity: number;
  status: FlightStatus;
  currency: string;
  inventories?: SeatInventoryDetail[];
  seat_inventory?: SeatInventoryResponse[];
  created_at: string;
}

// WaitlistEntryResponse - detailed waitlist entry
export interface WaitlistEntryResponse {
  id: string;
  flight_id: string;
  seat_class: SeatClass;
  passenger_name: string;
  email: string;
  loyalty_tier: LoyaltyTier;
  fare_type: FareType;
  status: WaitlistStatus;
  priority_score: number;
  loyalty_rank: number;
  fare_type_rank: number;
  position: number;
  claim_deadline?: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string | null;
  state_before?: any;
  state_after?: any;
  details?: Record<string, any> | null;
  timestamp: string;
  created_at?: string;
}

export interface DashboardStatsResponse {
  total_flights: number;
  active_flights: number;
  scheduled_flights?: number;
  total_bookings: number;
  confirmed_bookings: number;
  held_bookings: number;
  seats_currently_held?: number;
  total_revenue: number;
  pending_refunds: number;
  waitlist_count: number;
  waitlist_entries?: number;
}

export type Currency = string;
export const Currency = {
  USD: 'USD' as const,
  EUR: 'EUR' as const,
  GBP: 'GBP' as const,
  PKR: 'PKR' as const,
  AED: 'AED' as const,
};

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
export const SeatStatus = {
  AVAILABLE: 'AVAILABLE' as const,
  HELD: 'HELD' as const,
  BOOKED: 'BOOKED' as const,
  BLOCKED: 'BLOCKED' as const,
};

export interface SeatItem {
  seat_number: string;
  seat_class: SeatClass;
  status?: SeatStatus;
  is_available?: boolean;
  price?: number;
}

export type CreateFlightRequest = FlightCreateRequest;


