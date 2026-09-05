# ✈️ Flight Management System Backend

This repository contains the core API backend for a comprehensive **Flight Management System**. It is built using **FastAPI** and uses **Supabase (PostgreSQL)** for the database.

## 🌟 Key Features

* **Authentication & Authorization**: Secure JWT-based auth with Role-Based Access Control (Super Admin, Admin/Ops, Passenger).
* **Flight Management**: Admin endpoints for creating flights, configuring seat classes (First, Business, Economy), and setting dynamic fare rules and capacities.
* **Seat Inventory & Allocation**: Real-time physical seat mapping, preventing double-bookings. Supports basic and flexible fare constraints.
* **Booking System**: Hold and confirm flows with strict idempotency and atomicity guarantees.
* **Waitlisting**: Automated waitlist queueing and promotion when seats become available.
* **Refunds & Travel Credits**: Handles automatic refunds/credits on cancellations (both passenger-initiated and airline-initiated schedule changes).
* **Airline Schedule Changes**: Admin endpoint to re-schedule flights and bulk-process affected passenger bookings.
* **Auditing**: Comprehensive audit logs for every state-changing operation in the system.

## 🛠️ Technology Stack

* **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/)
* **ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async)
* **Database**: [Supabase](https://supabase.com/) (PostgreSQL 17.6 with Transaction Pooler)
* **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
* **Validation**: [Pydantic](https://docs.pydantic.dev/)

## 🚀 Local Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/coddies/Hackathon.git
cd Hackathon
```

### 2. Set up Virtual Environment
We recommend using `uv` or `venv` for managing Python dependencies.
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (you can copy from `.env.example`).
Ensure you set up your database connection via the Supabase connection pooler:
```env
# Example .env configuration
DATABASE_URL=postgresql+asyncpg://postgres.your_db_id:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
ENVIRONMENT=development
SECRET_KEY=your_super_secret_jwt_key
```

### 5. Run Database Migrations
Make sure your database is up to date:
```bash
alembic upgrade head
```
*(Note: Initial tables might be set up via a setup script. If `alembic` is out of sync, refer to `migrate_new_tables.py` for manual asyncpg execution).*

### 6. Start the FastAPI Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 📖 API Documentation
Once the server is running, the interactive Swagger documentation is available at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

## 🛡️ Idempotency
Critical endpoints (like booking confirmations, seat holds, and cancellations) require an `Idempotency-Key` header to prevent double-charging or duplicate resource generation in case of network retries.
