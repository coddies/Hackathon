# Flight Management System — FastAPI Backend Specification

## Purpose

FastAPI handles all live, request-triggered and transactional operations.

FastAPI is the only write path for:

- Flight creation and admin flight operations
- Live search and fare/inventory availability
- Seat holds and booking confirmation
- Cancellations and refunds decision logic
- Waitlist joining and priority assignment
- FastAPI-triggered transactional emails
- Request validation, role checks, audit logs and idempotency

Supabase Postgres is the operational source of truth.

n8n does not call FastAPI for its background tasks. n8n independently reads/writes its assigned Postgres tables.

---

## Technology

- Python 3.11+
- FastAPI
- SQLAlchemy
- Pydantic v2
- Supabase Postgres
- PostgreSQL driver: psycopg / asyncpg
- JWT authentication
- Gmail API or SMTP for transaction-triggered emails
- Railway deployment

---

## Main API Groups

```text
/auth
/admin
/flights
/bookings
/waitlist
/refunds
/health
```

---

# 1. Admin and Flight Management

## Requirement

Admin creates, edits and cancels flights. FastAPI owns inventory-defining writes.

## Endpoint: Create Flight

```http
POST /admin/flights
```

### Request

```json
{
  "flight_number": "PK-701",
  "origin": "LHE",
  "destination": "DXB",
  "departure_at": "2026-09-10T05:00:00+05:00",
  "arrival_at": "2026-09-10T08:00:00+04:00",
  "aircraft_capacity": 100,
  "seat_classes": [
    {
      "seat_class": "FIRST",
      "total_seats": 20,
      "fare_basic": 800,
      "fare_flexible": 1000
    },
    {
      "seat_class": "BUSINESS",
      "total_seats": 30,
      "fare_basic": 400,
      "fare_flexible": 550
    },
    {
      "seat_class": "ECONOMY",
      "total_seats": 50,
      "fare_basic": 150,
      "fare_flexible": 220
    }
  ]
}
```

## Required Validation

- `origin` and `destination` cannot be same
- departure must be before arrival
- flight number cannot duplicate for same route/day
- total of First + Business + Economy must equal aircraft capacity
- seat count must be a positive integer
- seat count cannot be zero or negative
- only authorized admin roles can create a flight
- create audit-log record

## Endpoint: Edit Flight Schedule

```http
PUT /admin/flights/{flight_id}
```

### Supported changes

- Origin
- Destination
- Departure datetime
- Arrival datetime
- Seat allocation only if new allocation is not lower than booked seat count

## Required behavior

- Existing booking impacts must be stored/logged
- Audit entry must record old and new values
- Cannot reduce class capacity below current confirmed/held booking count

## Endpoint: Cancel Flight

```http
POST /admin/flights/{flight_id}/cancel
```

## Required behavior

- Mark flight status as `CANCELLED`
- Record audit log
- Trigger booking outcomes: refund, rebook, or travel credit according to policy
- n8n reminders must ignore cancelled flights

## Admin Roles

```text
SUPER_ADMIN:
- create flight
- edit flight
- cancel flight
- change seat allocation
- manage admin roles

OPS_AGENT:
- permitted create/edit operations according to configured access
- cannot perform restricted super-admin operations
```

---

# 2. Search and Fare Rules

## Endpoint: Search Flights

```http
GET /flights/search?origin=LHE&destination=DXB&date=2026-09-10&passengers=1
```

## Response includes

- Flight number
- Origin and destination
- Departure/arrival datetime
- Flight status
- Seat availability by class
- Fare types
- Fare rules
- Currency/locale representation where enabled

## Fare Types

```text
BASIC:
- no changes
- no seat choice

FLEXIBLE:
- fare changes permitted according to policy
- seat choice supported where applicable
```

## Price Hold

During checkout, a returned fare may be held for a configured time.

```text
hold_started_at
hold_expires_at
status = HELD
```

After expiry, held inventory returns to available inventory if payment/confirmation was not completed.

## Multi-Leg Itinerary

The API design must support an itinerary that contains multiple legs.

If one leg becomes unavailable before confirmation, the itinerary must not be incorrectly confirmed as fully booked.

---

# 3. Seat Holds and Booking

## Endpoint: Create Seat Hold

```http
POST /bookings/hold
```

## Request

```json
{
  "flight_id": "uuid",
  "seat_class": "ECONOMY",
  "passenger_count": 1,
  "fare_type": "BASIC"
}
```

## Required behavior

- Verify available inventory
- Create temporary hold
- Set expiry time
- Decrement/lock available inventory safely
- Return hold ID and expiry timestamp

## Endpoint: Confirm Booking

```http
POST /bookings
Idempotency-Key: unique-client-request-key
```

## Required behavior

- Confirm a valid non-expired hold
- Create booking and passengers
- Prevent duplicate booking for same idempotency key
- Decrement inventory atomically
- Never allow negative inventory
- Create audit log
- Send transaction-triggered booking confirmation email by FastAPI

## Atomic Inventory Rule

Seat inventory update must be atomic.

```sql
UPDATE seat_inventory
SET available_seats = available_seats - :requested_count
WHERE flight_id = :flight_id
  AND seat_class = :seat_class
  AND available_seats >= :requested_count;
```

If affected rows = 0:

```text
Booking must fail or transition to waitlist.
```

## Overbooking Policy

Each seat class has one explicit policy:

```text
HARD_NEVER_OVERSELL:
- booking rejected if no inventory

BUFFER_ALLOWED:
- booking permitted only within defined overbooking buffer
```

## Group Booking

For group booking of N seats, policy must decide one of:

```text
FULL_FAIL:
- if all N seats unavailable, no seats held

PARTIAL_HOLD:
- hold available number only and show partial result

WAITLIST:
- group goes to waitlist
```

## Class-Specific Cutoff

Each class can have different booking cutoff times.

Example:

```text
Economy: booking closes 3 hours before departure
Business: booking closes 2 hours before departure
First: booking closes 1 hour before departure
```

---

# 4. Changes, Cancellations and Refunds

## Endpoint: Cancel Booking

```http
POST /bookings/{booking_reference}/cancel
```

## Required cancellation decisions

```text
REFUNDABLE:
- calculate refund

CREDIT_ONLY:
- issue travel credit with expiration

NON_REFUNDABLE:
- no cash refund
```

## Partial Cancellation

A booking containing multiple passengers can cancel one or more passengers.

Required behavior:

- Determine cancelled passengers
- Recalculate affected price/refund
- Release only cancelled passenger seats
- Keep other passengers confirmed

## Airline-Initiated Schedule Change

When admin changes/cancels flight:

- Determine eligible affected bookings
- Apply automatic rebooking rule if configured
- Apply fare-policy override if airline initiated change
- Store the decision in audit logs

## Flight Cancellation Outcomes

For impacted passengers, store one of:

```text
REFUND
REBOOK
TRAVEL_CREDIT
```

Travel credit must store expiry date.

---

# 5. Waitlist and Standby

## Endpoint: Join Waitlist

```http
POST /waitlist
```

## Request

```json
{
  "flight_id": "uuid",
  "seat_class": "ECONOMY",
  "passenger_name": "Ali Khan",
  "email": "ali@example.com",
  "loyalty_tier": "SILVER",
  "fare_type": "FLEXIBLE"
}
```

## Required behavior

- User can join only when configured class/flight is full
- Calculate/store waitlist priority
- Store waitlist status as `WAITING`
- Record created time
- n8n later promotes according to priority rule

## Waitlist Priority Rule

Priority must be explicitly chosen and documented:

```text
1. loyalty tier
2. booking time
3. fare class/type
```

FastAPI must calculate/store the priority data needed by n8n.

---

# 6. Transactional Email

FastAPI sends request-triggered emails:

```text
- Booking confirmation
- Cancellation receipt
```

n8n sends scheduled/background emails:

```text
- Check-in reminder
- Waitlist promotion offer
- Refund escalation
- Price drop alert
- Operations report
```

---

# 7. Audit Logging

Every important admin decision and booking-affecting action records:

```text
actor_id
actor_role
action
entity_type
entity_id
old_data
new_data
reason
created_at
```

---

# 8. Idempotency

All booking-affecting write routes accept:

```http
Idempotency-Key: unique-key
```

Required behavior:

- Same key + same route + same request body: return existing result
- Same key + different request body: return conflict error
- New key: process normally

---

# 9. Required Response Errors

```text
400 - validation error / invalid request
401 - not authenticated
403 - role not authorized
404 - flight/booking/resource not found
409 - conflict
422 - Pydantic request validation error
500 - unexpected server error
```

---

# 10. Health Endpoint

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "flight-management-api",
  "database": "connected"
}
```
