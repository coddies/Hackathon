-- =============================================================================
-- Flight Management System — Complete PostgreSQL & Supabase Database Schema
-- File: database/schema.sql
-- 
-- Description:
-- Complete DDL schema designed for PostgreSQL 14+ and Supabase Postgres.
-- Fully aligned with FastAPI SQLAlchemy models, Alembic migrations,
-- and background n8n automation workflows.
--
-- Includes:
-- - UUID extensions (pgcrypto, uuid-ossp)
-- - Custom PostgreSQL ENUM types
-- - Tables with exact column names, data types, and nullability
-- - Foreign key constraints with cascading rules
-- - Check constraints and unique constraints
-- - Performance indexes for search, foreign keys, and audit querying
-- - Automated updated_at trigger functions
-- - Idempotent seed data (Super Admin, Ops Agent, Passenger, UK-DXB flight, inventory)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 2. ENUM TYPES
-- -----------------------------------------------------------------------------

-- Users
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'OPS_AGENT', 'PASSENGER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Flights & Inventory
DO $$ BEGIN
    CREATE TYPE flight_status AS ENUM ('SCHEDULED', 'DELAYED', 'DEPARTED', 'ARRIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE seat_class AS ENUM ('FIRST', 'BUSINESS', 'ECONOMY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE overbooking_policy AS ENUM ('HARD_NEVER_OVERSELL', 'BUFFER_ALLOWED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE group_booking_policy AS ENUM ('FULL_FAIL', 'PARTIAL_HOLD', 'WAITLIST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE fare_type AS ENUM ('BASIC', 'FLEXIBLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Itineraries & Holds
DO $$ BEGIN
    CREATE TYPE itinerary_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE hold_status AS ENUM ('HELD', 'EXPIRED', 'CONFIRMED', 'RELEASED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bookings & Passengers
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'CANCELLED', 'REBOOKING_PENDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE cancellation_policy AS ENUM ('REFUNDABLE', 'CREDIT_ONLY', 'NON_REFUNDABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE flight_cancellation_outcome AS ENUM ('REFUND', 'REBOOK', 'TRAVEL_CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE passenger_status AS ENUM ('CONFIRMED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Waitlist
DO $$ BEGIN
    CREATE TYPE waitlist_status AS ENUM ('WAITING', 'PROMOTED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE loyalty_tier AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Refunds & Credits
DO $$ BEGIN
    CREATE TYPE refund_type AS ENUM ('CASH', 'TRAVEL_CREDIT', 'NONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Operational, Notification & Policy Management
DO $$ BEGIN
    CREATE TYPE schedule_change_type AS ENUM ('SCHEDULE_UPDATE', 'CANCELLATION', 'DELAY', 'AIRCRAFT_CHANGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'BOOKING_CONFIRMATION',
        'CANCELLATION_RECEIPT',
        'CHECK_IN_REMINDER',
        'WAITLIST_PROMOTION',
        'REFUND_ESCALATION',
        'PRICE_DROP_ALERT',
        'OPERATIONS_REPORT',
        'SCHEDULE_CHANGE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WEBHOOK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED', 'BOUNCED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE policy_draft_status AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'SENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE fraud_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE fraud_status AS ENUM ('OPEN', 'INVESTIGATING', 'DISMISSED', 'RESOLVED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 3. TRIGGER FUNCTION FOR updated_at TIMESTAMPS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 4. CORE TABLES
-- -----------------------------------------------------------------------------

-- 4.1 USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'PASSENGER',
    full_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 4.2 FLIGHTS
CREATE TABLE IF NOT EXISTS flights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_number VARCHAR(20) NOT NULL,
    origin VARCHAR(3) NOT NULL,
    destination VARCHAR(3) NOT NULL,
    departure_at TIMESTAMPTZ NOT NULL,
    arrival_at TIMESTAMPTZ NOT NULL,
    aircraft_capacity INTEGER NOT NULL,
    status flight_status NOT NULL DEFAULT 'SCHEDULED',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_flight_number_origin_dest UNIQUE (flight_number, origin, destination),
    CONSTRAINT chk_flights_origin_dest_diff CHECK (origin <> destination),
    CONSTRAINT chk_flights_departure_before_arrival CHECK (departure_at < arrival_at),
    CONSTRAINT chk_flights_aircraft_capacity_positive CHECK (aircraft_capacity > 0)
);

-- 4.3 SEAT INVENTORY
CREATE TABLE IF NOT EXISTS seat_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_class seat_class NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    held_seats INTEGER NOT NULL DEFAULT 0,
    overbooking_policy overbooking_policy NOT NULL DEFAULT 'HARD_NEVER_OVERSELL',
    overbooking_buffer INTEGER NOT NULL DEFAULT 0,
    fare_basic NUMERIC(10, 2) NOT NULL,
    fare_flexible NUMERIC(10, 2) NOT NULL,
    booking_cutoff_hours INTEGER NOT NULL DEFAULT 3,
    group_booking_policy group_booking_policy NOT NULL DEFAULT 'FULL_FAIL',
    CONSTRAINT uq_seatinv_flight_class UNIQUE (flight_id, seat_class),
    CONSTRAINT chk_seatinv_total_seats_non_neg CHECK (total_seats >= 0),
    CONSTRAINT chk_seatinv_available_seats_non_neg CHECK (available_seats >= 0),
    CONSTRAINT chk_seatinv_held_seats_non_neg CHECK (held_seats >= 0),
    CONSTRAINT chk_seatinv_buffer_non_neg CHECK (overbooking_buffer >= 0),
    CONSTRAINT chk_seatinv_fare_basic_non_neg CHECK (fare_basic >= 0),
    CONSTRAINT chk_seatinv_fare_flex_non_neg CHECK (fare_flexible >= 0),
    CONSTRAINT chk_seatinv_cutoff_hours_non_neg CHECK (booking_cutoff_hours >= 0)
);

-- 4.4 ITINERARIES
CREATE TABLE IF NOT EXISTS itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status itinerary_status NOT NULL DEFAULT 'PENDING',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- 4.5 ITINERARY LEGS
CREATE TABLE IF NOT EXISTS itinerary_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    leg_order INTEGER NOT NULL,
    seat_class seat_class NOT NULL,
    fare_type fare_type NOT NULL,
    passenger_count INTEGER NOT NULL,
    CONSTRAINT uq_itinerary_legs_order UNIQUE (itinerary_id, leg_order),
    CONSTRAINT chk_itinerary_legs_order_positive CHECK (leg_order >= 1),
    CONSTRAINT chk_itinerary_legs_passengers_positive CHECK (passenger_count > 0)
);

-- 4.6 SEAT HOLDS
CREATE TABLE IF NOT EXISTS seat_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_class seat_class NOT NULL,
    fare_type fare_type NOT NULL,
    passenger_count INTEGER NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status hold_status NOT NULL DEFAULT 'HELD',
    hold_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hold_expires_at TIMESTAMPTZ NOT NULL,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_seat_holds_passengers_positive CHECK (passenger_count > 0),
    CONSTRAINT chk_seat_holds_expiry_after_start CHECK (hold_expires_at > hold_started_at)
);

-- 4.7 BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_class seat_class NOT NULL,
    fare_type fare_type NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status booking_status NOT NULL DEFAULT 'CONFIRMED',
    cancellation_policy cancellation_policy NOT NULL,
    hold_id UUID REFERENCES seat_holds(id) ON DELETE SET NULL,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
    airline_initiated BOOLEAN NOT NULL DEFAULT FALSE,
    flight_cancellation_outcome flight_cancellation_outcome,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_bookings_total_amount_non_neg CHECK (total_amount >= 0)
);

-- 4.8 PASSENGERS
CREATE TABLE IF NOT EXISTS passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    passport_number VARCHAR(50),
    date_of_birth DATE,
    status passenger_status NOT NULL DEFAULT 'CONFIRMED',
    cancelled_at TIMESTAMPTZ,
    refund_amount NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_passengers_refund_amount_non_neg CHECK (refund_amount IS NULL OR refund_amount >= 0)
);

-- 4.9 PHYSICAL SEATS / SEAT MAP
CREATE TABLE IF NOT EXISTS physical_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_number VARCHAR(10) NOT NULL,
    seat_class seat_class NOT NULL,
    row_number INTEGER NOT NULL,
    column_letter VARCHAR(2) NOT NULL,
    is_exit_row BOOLEAN NOT NULL DEFAULT FALSE,
    is_window BOOLEAN NOT NULL DEFAULT FALSE,
    is_aisle BOOLEAN NOT NULL DEFAULT FALSE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT uq_physical_seats_flight_seat UNIQUE (flight_id, seat_number),
    CONSTRAINT chk_physical_seats_row_positive CHECK (row_number > 0)
);

-- View providing seamless compatibility for queries referencing seat_map
CREATE OR REPLACE VIEW seat_map AS
SELECT * FROM physical_seats;

-- 4.10 WAITLIST ENTRIES
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    seat_class seat_class NOT NULL,
    passenger_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    loyalty_tier loyalty_tier NOT NULL DEFAULT 'NONE',
    fare_type fare_type NOT NULL,
    status waitlist_status NOT NULL DEFAULT 'WAITING',
    priority_score INTEGER NOT NULL DEFAULT 0,
    loyalty_rank INTEGER NOT NULL DEFAULT 5,
    fare_type_rank INTEGER NOT NULL DEFAULT 2,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    promoted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_waitlist_priority_non_neg CHECK (priority_score >= 0),
    CONSTRAINT chk_waitlist_position_non_neg CHECK (position >= 0)
);

-- 4.11 REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
    refund_type refund_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status refund_status NOT NULL DEFAULT 'PENDING',
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_refunds_amount_non_neg CHECK (amount >= 0)
);

-- 4.12 TRAVEL CREDITS
CREATE TABLE IF NOT EXISTS travel_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_travel_credits_amount_positive CHECK (amount > 0)
);

-- 4.13 AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4.14 IDEMPOTENCY KEYS
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    route VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_idempotency_key_route UNIQUE (key, route),
    CONSTRAINT chk_idempotency_status_valid CHECK (response_status >= 100 AND response_status <= 599)
);

-- 4.15 SCHEDULE CHANGES
CREATE TABLE IF NOT EXISTS schedule_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
    change_type schedule_change_type NOT NULL,
    original_departure_at TIMESTAMPTZ,
    new_departure_at TIMESTAMPTZ,
    original_arrival_at TIMESTAMPTZ,
    new_arrival_at TIMESTAMPTZ,
    original_status flight_status,
    new_status flight_status,
    affected_bookings_count INTEGER NOT NULL DEFAULT 0,
    rebooking_applied BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_schedule_changes_affected_non_neg CHECK (affected_bookings_count >= 0)
);

-- 4.16 NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notification_type notification_type NOT NULL,
    channel notification_channel NOT NULL DEFAULT 'EMAIL',
    subject VARCHAR(255),
    body TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status notification_status NOT NULL DEFAULT 'SENT',
    error_message TEXT,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    flight_id UUID REFERENCES flights(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4.17 POLICY ANSWER DRAFTS
CREATE TABLE IF NOT EXISTS policy_answer_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    draft_answer TEXT NOT NULL,
    policy_category VARCHAR(50) NOT NULL DEFAULT 'CANCELLATION_AND_REFUND',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    confidence_score NUMERIC(5, 4),
    status policy_draft_status NOT NULL DEFAULT 'DRAFT',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    CONSTRAINT chk_policy_confidence_range CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0))
);

-- 4.18 FRAUD ALERTS
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    severity fraud_severity NOT NULL DEFAULT 'MEDIUM',
    alert_type VARCHAR(50) NOT NULL,
    status fraud_status NOT NULL DEFAULT 'OPEN',
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 5. INDEXES FOR PERFORMANCE OPTIMIZATION
-- -----------------------------------------------------------------------------

-- Users
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);

-- Flights (Search Optimization)
CREATE INDEX IF NOT EXISTS ix_flights_search ON flights(origin, destination, departure_at);
CREATE INDEX IF NOT EXISTS ix_flights_status ON flights(status);
CREATE INDEX IF NOT EXISTS ix_flights_departure ON flights(departure_at);
CREATE INDEX IF NOT EXISTS ix_flights_flight_number ON flights(flight_number);

-- Seat Inventory
CREATE INDEX IF NOT EXISTS ix_seat_inventory_flight_id ON seat_inventory(flight_id);

-- Itineraries & Legs
CREATE INDEX IF NOT EXISTS ix_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS ix_itinerary_legs_itinerary_id ON itinerary_legs(itinerary_id);
CREATE INDEX IF NOT EXISTS ix_itinerary_legs_flight_id ON itinerary_legs(flight_id);

-- Seat Holds
CREATE INDEX IF NOT EXISTS ix_seat_holds_flight_id ON seat_holds(flight_id);
CREATE INDEX IF NOT EXISTS ix_seat_holds_user_id ON seat_holds(user_id);
CREATE INDEX IF NOT EXISTS ix_seat_holds_status_expires ON seat_holds(status, hold_expires_at);

-- Bookings
CREATE INDEX IF NOT EXISTS ix_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS ix_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS ix_bookings_flight_id ON bookings(flight_id);
CREATE INDEX IF NOT EXISTS ix_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS ix_bookings_created_at ON bookings(created_at);

-- Passengers
CREATE INDEX IF NOT EXISTS ix_passengers_booking_id ON passengers(booking_id);
CREATE INDEX IF NOT EXISTS ix_passengers_email ON passengers(email);

-- Physical Seats
CREATE INDEX IF NOT EXISTS ix_physical_seats_flight_id ON physical_seats(flight_id);
CREATE INDEX IF NOT EXISTS ix_physical_seats_booking_id ON physical_seats(booking_id);
CREATE INDEX IF NOT EXISTS ix_physical_seats_passenger_id ON physical_seats(passenger_id);

-- Waitlist Entries (Priority Sorting)
CREATE INDEX IF NOT EXISTS ix_waitlist_priority ON waitlist_entries(flight_id, seat_class, status, priority_score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS ix_waitlist_user_id ON waitlist_entries(user_id);

-- Refunds & Travel Credits
CREATE INDEX IF NOT EXISTS ix_refunds_booking_id ON refunds(booking_id);
CREATE INDEX IF NOT EXISTS ix_refunds_passenger_id ON refunds(passenger_id);
CREATE INDEX IF NOT EXISTS ix_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS ix_travel_credits_user_active ON travel_credits(user_id, is_used, expires_at);
CREATE INDEX IF NOT EXISTS ix_travel_credits_booking_id ON travel_credits(booking_id);

-- Audit Logs
CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_created ON audit_logs(created_at);

-- Idempotency Keys
CREATE INDEX IF NOT EXISTS ix_idempotency_created ON idempotency_keys(created_at);

-- Operations & Automated Workflows
CREATE INDEX IF NOT EXISTS ix_schedule_changes_flight_id ON schedule_changes(flight_id);
CREATE INDEX IF NOT EXISTS ix_schedule_changes_created ON schedule_changes(created_at);
CREATE INDEX IF NOT EXISTS ix_notification_logs_recipient ON notification_logs(recipient_email);
CREATE INDEX IF NOT EXISTS ix_notification_logs_status ON notification_logs(status, sent_at);
CREATE INDEX IF NOT EXISTS ix_notification_logs_booking_id ON notification_logs(booking_id);
CREATE INDEX IF NOT EXISTS ix_policy_drafts_status ON policy_answer_drafts(status, policy_category);
CREATE INDEX IF NOT EXISTS ix_fraud_alerts_status_severity ON fraud_alerts(status, severity);
CREATE INDEX IF NOT EXISTS ix_fraud_alerts_booking_id ON fraud_alerts(booking_id);

-- -----------------------------------------------------------------------------
-- 6. TRIGGERS FOR AUTOMATIC updated_at MAINTENANCE
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_flights_updated_at ON flights;
CREATE TRIGGER trg_flights_updated_at
    BEFORE UPDATE ON flights
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_itineraries_updated_at ON itineraries;
CREATE TRIGGER trg_itineraries_updated_at
    BEFORE UPDATE ON itineraries
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_seat_holds_updated_at ON seat_holds;
CREATE TRIGGER trg_seat_holds_updated_at
    BEFORE UPDATE ON seat_holds
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_passengers_updated_at ON passengers;
CREATE TRIGGER trg_passengers_updated_at
    BEFORE UPDATE ON passengers
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_physical_seats_updated_at ON physical_seats;
CREATE TRIGGER trg_physical_seats_updated_at
    BEFORE UPDATE ON physical_seats
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_waitlist_entries_updated_at ON waitlist_entries;
CREATE TRIGGER trg_waitlist_entries_updated_at
    BEFORE UPDATE ON waitlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_refunds_updated_at ON refunds;
CREATE TRIGGER trg_refunds_updated_at
    BEFORE UPDATE ON refunds
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_travel_credits_updated_at ON travel_credits;
CREATE TRIGGER trg_travel_credits_updated_at
    BEFORE UPDATE ON travel_credits
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_schedule_changes_updated_at ON schedule_changes;
CREATE TRIGGER trg_schedule_changes_updated_at
    BEFORE UPDATE ON schedule_changes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_policy_answer_drafts_updated_at ON policy_answer_drafts;
CREATE TRIGGER trg_policy_answer_drafts_updated_at
    BEFORE UPDATE ON policy_answer_drafts
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_fraud_alerts_updated_at ON fraud_alerts;
CREATE TRIGGER trg_fraud_alerts_updated_at
    BEFORE UPDATE ON fraud_alerts
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. SEED DATA
-- -----------------------------------------------------------------------------
-- All passwords below are hashed with bcrypt (passlib compatible):
--   Default plaintext for all seed accounts: 'Password123!'
--   Hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4hZ6V5uL2S
-- -----------------------------------------------------------------------------

-- 7.1 SEED USERS: SUPER_ADMIN, OPS_AGENT, PASSENGER
INSERT INTO users (id, email, hashed_password, role, full_name, is_active)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'superadmin@airline.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4hZ6V5uL2S',
        'SUPER_ADMIN',
        'Chief System Administrator',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'opsagent@airline.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4hZ6V5uL2S',
        'OPS_AGENT',
        'Operations Control Specialist',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'passenger@example.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4hZ6V5uL2S',
        'PASSENGER',
        'Tariq Alexander Vance',
        TRUE
    )
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- 7.2 SEED SAMPLE FLIGHT: UK (London Heathrow - LHR) to Dubai (DXB)
-- Total Aircraft Capacity: 100 seats
INSERT INTO flights (
    id,
    flight_number,
    origin,
    destination,
    departure_at,
    arrival_at,
    aircraft_capacity,
    status,
    created_by
)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'BA-105',
    'LHR',
    'DXB',
    '2026-10-15 09:30:00+00',
    '2026-10-15 20:00:00+04',
    100,
    'SCHEDULED',
    'a0000000-0000-0000-0000-000000000001'
)
ON CONFLICT (flight_number, origin, destination) DO UPDATE
SET departure_at = EXCLUDED.departure_at,
    arrival_at = EXCLUDED.arrival_at,
    aircraft_capacity = EXCLUDED.aircraft_capacity,
    status = EXCLUDED.status;

-- 7.3 SEED SEAT INVENTORY FOR BA-105
-- FIRST (12 seats) + BUSINESS (28 seats) + ECONOMY (60 seats) = 100 seats total
INSERT INTO seat_inventory (
    id,
    flight_id,
    seat_class,
    total_seats,
    available_seats,
    held_seats,
    overbooking_policy,
    overbooking_buffer,
    fare_basic,
    fare_flexible,
    booking_cutoff_hours,
    group_booking_policy
)
VALUES
    (
        's0000000-0000-0000-0000-000000000001',
        'f0000000-0000-0000-0000-000000000001',
        'FIRST',
        12,
        12,
        0,
        'HARD_NEVER_OVERSELL',
        0,
        1200.00,
        1550.00,
        1,
        'FULL_FAIL'
    ),
    (
        's0000000-0000-0000-0000-000000000002',
        'f0000000-0000-0000-0000-000000000001',
        'BUSINESS',
        28,
        28,
        0,
        'HARD_NEVER_OVERSELL',
        0,
        650.00,
        850.00,
        2,
        'FULL_FAIL'
    ),
    (
        's0000000-0000-0000-0000-000000000003',
        'f0000000-0000-0000-0000-000000000001',
        'ECONOMY',
        60,
        60,
        0,
        'BUFFER_ALLOWED',
        5,
        220.00,
        320.00,
        3,
        'FULL_FAIL'
    )
ON CONFLICT (flight_id, seat_class) DO UPDATE
SET total_seats = EXCLUDED.total_seats,
    available_seats = EXCLUDED.available_seats,
    fare_basic = EXCLUDED.fare_basic,
    fare_flexible = EXCLUDED.fare_flexible,
    booking_cutoff_hours = EXCLUDED.booking_cutoff_hours;

-- 7.4 SEED PHYSICAL SEATS SAMPLE CONFIGURATION (BA-105)
-- First Class: Rows 1-3 (12 seats: 4 seats/row - A, C, D, F)
INSERT INTO physical_seats (flight_id, seat_number, seat_class, row_number, column_letter, is_window, is_aisle)
VALUES
    ('f0000000-0000-0000-0000-000000000001', '1A', 'FIRST', 1, 'A', TRUE, FALSE),
    ('f0000000-0000-0000-0000-000000000001', '1C', 'FIRST', 1, 'C', FALSE, TRUE),
    ('f0000000-0000-0000-0000-000000000001', '1D', 'FIRST', 1, 'D', FALSE, TRUE),
    ('f0000000-0000-0000-0000-000000000001', '1F', 'FIRST', 1, 'F', TRUE, FALSE),
    ('f0000000-0000-0000-0000-000000000001', '2A', 'FIRST', 2, 'A', TRUE, FALSE),
    ('f0000000-0000-0000-0000-000000000001', '2C', 'FIRST', 2, 'C', FALSE, TRUE),
    ('f0000000-0000-0000-0000-000000000001', '2D', 'FIRST', 2, 'D', FALSE, TRUE),
    ('f0000000-0000-0000-0000-000000000001', '2F', 'FIRST', 2, 'F', TRUE, FALSE)
ON CONFLICT (flight_id, seat_number) DO NOTHING;
