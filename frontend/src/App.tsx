import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts & Route Protection
import { PassengerLayout, AdminLayout } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { UserRole } from './types';

// Passenger Pages
import { LandingPage } from './pages/passenger/LandingPage';
import { SearchResultsPage } from './pages/passenger/SearchResultsPage';
import { FlightDetailPage } from './pages/passenger/FlightDetailPage';
import { CheckoutPage } from './pages/passenger/CheckoutPage';
import { BookingConfirmationPage } from './pages/passenger/BookingConfirmationPage';
import { MyBookingsPage } from './pages/passenger/MyBookingsPage';
import { BookingDetailPage } from './pages/passenger/BookingDetailPage';
import { WaitlistStatusPage } from './pages/passenger/WaitlistStatusPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminFlightsPage } from './pages/admin/AdminFlightsPage';
import { AdminCreateFlightPage } from './pages/admin/AdminCreateFlightPage';
import { AdminFlightDetailPage } from './pages/admin/AdminFlightDetailPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminRefundsPage } from './pages/admin/AdminRefundsPage';
import { AdminWaitlistPage } from './pages/admin/AdminWaitlistPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminAutomationsPage } from './pages/admin/AdminAutomationsPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route element={<PassengerLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Passenger Feature Routes (Require Login/Signup) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/flight/:flightId" element={<FlightDetailPage />} />
                <Route path="/checkout/:flightId" element={<CheckoutPage />} />
                <Route path="/booking/:bookingReference" element={<BookingConfirmationPage />} />
                <Route path="/my-bookings" element={<MyBookingsPage />} />
                <Route path="/my-bookings/:reference" element={<BookingDetailPage />} />
                <Route path="/waitlist/:waitlistId" element={<WaitlistStatusPage />} />
              </Route>
            </Route>

            {/* Admin / Operations Routes (Protected for OPS_AGENT and SUPER_ADMIN) */}
            <Route
              element={
                <ProtectedRoute allowedRoles={[UserRole.OPS_AGENT, UserRole.SUPER_ADMIN]} />
              }
            >
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/flights" element={<AdminFlightsPage />} />
                <Route
                  path="/admin/flights/new"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />
                  }
                >
                  <Route index element={<AdminCreateFlightPage />} />
                </Route>
                <Route path="/admin/flights/:id" element={<AdminFlightDetailPage />} />
                <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                <Route path="/admin/refunds" element={<AdminRefundsPage />} />
                <Route path="/admin/waitlist" element={<AdminWaitlistPage />} />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />
                  }
                >
                  <Route index element={<AdminAuditLogsPage />} />
                </Route>
                <Route path="/admin/automations" element={<AdminAutomationsPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
