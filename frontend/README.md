# ✈️ SkyFlow Frontend Client

Modern, responsive React 19 single-page application built with **TypeScript**, **Vite**, and **TailwindCSS** for the SkyFlow Flight Reservation & Operations Platform.

## 🌟 Key Features

- 🔐 **JWT-Based Authentication Guard**: All application booking and search workflows are strictly protected behind `<ProtectedRoute />`.
- 💺 **Interactive Seat Map**: Live visual cabin grid with First Class, Business Class, and Economy Class seat selection.
- ⏱️ **Atomic Seat Hold Countdown**: Real-time 15-minute countdown timer with automatic hold expiration handling.
- 💳 **Checkout & Fare Policy Engine**: Dynamic fare comparison (Basic, Flexible, Refundable) with instant policy calculation.
- 📋 **Passenger Self-Service Portal**: View reservation confirmation cards, electronic boarding passes, and cancellation processing.
- 🛠️ **Operations & Admin Console**:
  - Live metric KPI cards (active flights, passenger volume, refund queues).
  - Flight dispatching & schedule update modals.
  - Multi-cabin inventory & dynamic pricing matrix.
  - Priority waitlist management & automated escalation.
  - Immutable audit logs viewer.

## 🛠️ Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 8.2
- **Language**: TypeScript 5.7
- **Styling**: TailwindCSS 3.4
- **Routing**: React Router 7
- **Icons**: Lucide React
- **HTTP Client**: Axios with JWT Request/Response Interceptors

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env and set VITE_API_BASE_URL
cp .env.example .env

# Run development server
npm run dev
```

* Dev Server runs at `http://localhost:5173/`

## 📦 Production Build

```bash
# Typecheck and compile production bundle
npm run build

# Preview production build locally
npm run preview
```
