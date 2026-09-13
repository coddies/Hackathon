# 📋 Database Table Ownership — Flight Management System

> **Architecture Rule**: FastAPI is the sole writer for all transactional data.
> n8n reads widely but only writes to notification/audit/status-flag tables.
> Postgres-level constraints (CHECK, FK, UNIQUE, ENUM) protect invariants
> for all writers since n8n bypasses FastAPI validation.

---

## 🟦 FastAPI — Sole Writer Tables

These tables are **exclusively written** by the FastAPI backend.
n8n may **read** them but must never INSERT/UPDATE/DELETE directly.

| Table | Purpose | Key Constraints |
|---|---|---|
| `flights` | Flight schedule master record | `UNIQUE(flight_number, origin, destination)`, `status` enum |
| `seat_inventory` | Per-class seat counts and fare rules | `CHECK(available_seats >= 0)`, `CHECK(held_seats >= 0)`, `UNIQUE(flight_id, seat_class)` |
| `seat_holds` | Temporary 15-min seat reservations | FK → flights, FK → users, `status` enum |
| `bookings` | Confirmed booking records | `UNIQUE(booking_reference)`, FK → flights, FK → users, FK → seat_holds |
| `passengers` | Individual passengers per booking | FK → bookings, `status` enum |
| `refunds` | Cash refund records | FK → bookings, `status` enum (`PENDING`, `PROCESSED`, `FAILED`) |
| `travel_credits` | Non-cash travel credits | FK → users, FK → bookings, `expires_at` enforced |
| `users` | User accounts and roles | `UNIQUE(email)`, `role` enum |
| `idempotency_keys` | Idempotency key deduplication cache | `UNIQUE(key, route)` |
| `itineraries` | Multi-leg itinerary groups | FK → users |
| `itinerary_legs` | Per-leg itinerary records | FK → itineraries, FK → flights |
| `flight_seats` | Physical seat map per flight | FK → flights, FK → passengers, `is_available` bool |
| `schedule_changes` | Audit of flight schedule edits | FK → flights, FK → users (changed_by) |

---

## 🟧 n8n — Primary Writer Tables

n8n is the **primary writer** of these tables. FastAPI may read them.

| Table | Purpose | What n8n Writes |
|---|---|---|
| `notification_logs` | Deduplication log of all sent emails | INSERT per sent notification (check-in, price-drop, waitlist offer) |
| `waitlist_entries` (`status` field only) | Waitlist promotion state | UPDATE `status = 'PROMOTED'`, SET `promoted_at`, `claim_expires_at` |
| `refunds` (`escalation_sent_at` only) | Escalation timestamp on stale refunds | UPDATE `escalation_sent_at = NOW()` when escalation email sent |

---

## 🟩 Shared Tables (Both Read + Write)

| Table | FastAPI Writes | n8n Writes | Conflict Resolution |
|---|---|---|---|
| `audit_logs` | All booking/flight/auth events | Fraud scan results, RAG draft logs | Append-only — no conflicts possible |
| `waitlist_entries` | INSERT new entries via `POST /waitlist` | UPDATE `status` to `PROMOTED` | `FOR UPDATE SKIP LOCKED` in n8n promotion query prevents race with FastAPI cancellation |

---

## 🔒 Postgres-Level Invariants

Since n8n bypasses FastAPI Pydantic validation, these constraints protect the DB at the storage layer:

```sql
-- seat_inventory
CHECK (available_seats >= 0)
CHECK (held_seats >= 0)
UNIQUE (flight_id, seat_class)

-- flights
UNIQUE (flight_number, origin, destination)

-- bookings
UNIQUE (booking_reference)

-- idempotency_keys
UNIQUE (key, route)

-- All FK relationships enforce referential integrity
```

---

## ⚡ Concurrency Rules

| Scenario | Resolution |
|---|---|
| n8n promotes waitlist entry while FastAPI processes cancellation on same seat | n8n uses `FOR UPDATE SKIP LOCKED` — one wins, other skips and retries next cycle |
| FastAPI confirms booking while n8n reads seat_inventory for ops report | n8n reads only (reporting), no write conflict |
| n8n marks refund as escalated while FastAPI processes refund status update | `escalation_sent_at` and `status` are separate columns — no overlap |
| n8n inserts to audit_logs simultaneously with FastAPI | Append-only inserts — no conflict possible |

---

## 🏗️ Migration Policy

- All schema migrations managed via **Alembic**, run by FastAPI deployment
- n8n must **never** run DDL statements
- New columns needed by n8n must be added via Alembic migration first
- Migrations are applied before deploying FastAPI on Railway

---

*Last updated: 2026-09-12 | System: SkyFlow FMS*
