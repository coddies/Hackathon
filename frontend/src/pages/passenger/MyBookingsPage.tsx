import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPassengerBookingsApi, getBookingByReferenceApi } from '../../api/bookings';
import type { BookingResponse } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import {
  Ticket,
  Search,
  ArrowRight,
  PlusCircle,
  Calendar,
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupRef, setLookupRef] = useState('');
  const [searchingRef, setSearchingRef] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        if (isAuthenticated) {
          const list = await getPassengerBookingsApi();
          setBookings(list);
        }
      } catch (err: any) {
        // Passenger bookings endpoint may return empty array or 401 if unauthenticated
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [isAuthenticated]);

  const handleLookupReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRef.trim()) return;

    try {
      setSearchingRef(true);
      const booking = await getBookingByReferenceApi(lookupRef.trim().toUpperCase());
      navigate(`/my-bookings/${booking.booking_reference}`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'No booking found with this reference.');
    } finally {
      setSearchingRef(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header & Lookup Bar */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">Manage Your Bookings</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Access your flight itinerary, select baggage options, reschedule, or review cancellation and refund terms.
          </p>
        </div>

        {/* Search by Reference form */}
        <form onSubmit={handleLookupReference} className="p-4 bg-surface-soft rounded-lg border border-brandBorder/60 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="Find booking by 6-character reference (e.g., SK-9821A)"
              value={lookupRef}
              onChange={(e) => setLookupRef(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs uppercase font-mono rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={searchingRef || !lookupRef.trim()}
            className="w-full sm:w-auto px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            <span>{searchingRef ? 'Searching...' : 'Find Reservation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Bookings List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
            Your Flight Reservations
          </h2>
          <Link
            to="/"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Book New Flight</span>
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Fetching active reservations..." />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No Bookings Found"
            description="You don't have any registered flight bookings yet. Use the reference search above if you booked without logging in, or search for a new flight."
            actionLabel="Search Flights"
            onAction={() => navigate('/')}
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-surface rounded-card border border-brandBorder shadow-card p-5 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-navy bg-surface-soft px-2.5 py-0.5 rounded border border-brandBorder">
                      {booking.booking_reference}
                    </span>
                    <StatusBadge status={booking.status} />
                    <SeatClassBadge seatClass={booking.seat_class} />
                  </div>

                  <div className="flex items-center gap-2 text-sm font-bold text-navy">
                    <span>{booking.flight?.flight_number || 'SK-Flight'}</span>
                    <span className="text-muted font-normal">•</span>
                    <span>{booking.flight?.origin} → {booking.flight?.destination}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{booking.flight?.departure_time ? formatDate(booking.flight.departure_time) : 'Scheduled'}</span>
                    </div>
                    <span>•</span>
                    <span>{booking.passengers?.length || 1} Passenger(s)</span>
                    <span>•</span>
                    <span>
                    <CurrencyDisplay amount={booking.total_amount} currency={booking.currency} />
                    </span>
                  </div>
                </div>

                <Link
                  to={`/my-bookings/${booking.booking_reference}`}
                  className="px-4 py-2 bg-surface-soft hover:bg-primary hover:text-white text-navy text-xs font-semibold rounded-lg border border-brandBorder transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
