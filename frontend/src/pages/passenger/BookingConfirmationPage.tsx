import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBookingByReferenceApi } from '../../api/bookings';
import type { BookingResponse } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime } from '../../utils/formatters';
import {
  CheckCircle2,
  Printer,
  Copy,
  Plane,
  ArrowRight,
  Mail,
} from 'lucide-react';

export const BookingConfirmationPage: React.FC = () => {
  const { bookingReference } = useParams<{ bookingReference: string }>();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingReference) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getBookingByReferenceApi(bookingReference);
        setBooking(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Unable to retrieve confirmed booking.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingReference]);

  const handleCopyReference = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.booking_reference);
    showToast('success', 'Booking reference copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingState message="Retrieving your confirmed flight ticket..." />;
  if (error || !booking) return <ErrorState message={error || 'Booking reference not found'} onRetry={() => window.location.reload()} />;

  const primaryPassenger = booking.passengers?.[0];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 print:p-0 print:m-0 print:max-w-none">
      {/* Top Success Banner */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 text-center space-y-4 print:border-none print:shadow-none">
        <div className="w-16 h-16 bg-emerald-50 text-success rounded-full flex items-center justify-center mx-auto border border-success/20 animate-in zoom-in-50">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-navy">Booking Confirmed!</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Your flight has been securely ticketed. A confirmation email has been dispatched.
          </p>
        </div>

        {/* Reference Highlight Box */}
        <div className="max-w-xs mx-auto p-3 bg-surface-soft rounded-lg border border-brandBorder/80 flex items-center justify-between">
          <div className="text-left">
            <span className="block text-[10px] uppercase font-bold text-muted tracking-wider">Booking Reference</span>
            <span className="font-mono text-base font-extrabold text-navy">{booking.booking_reference}</span>
          </div>
          <button
            onClick={handleCopyReference}
            className="p-2 text-muted hover:text-navy hover:bg-surface rounded transition-colors print:hidden"
            title="Copy Reference"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flight Ticket Summary Card */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card overflow-hidden">
        {/* Ticket Header */}
        <div className="p-5 bg-navy text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Plane className="w-5 h-5 text-sky-400" />
            <span className="font-bold text-sm tracking-wide">SkyFlow Boarding Pass & Confirmation</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
          </div>
        </div>

        {/* Route Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center border-b border-brandBorder/60 pb-6">
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Flight</span>
              <div className="text-xl font-extrabold text-navy">{booking.flight?.flight_number || 'SK-FLIGHT'}</div>
              <div className="text-xs text-muted">Confirmed Aircraft</div>
            </div>

            <div className="text-left sm:text-center">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Route</span>
              <div className="text-lg font-bold text-navy flex items-center sm:justify-center gap-2">
                <span>{booking.flight?.origin}</span>
                <span className="text-primary">→</span>
                <span>{booking.flight?.destination}</span>
              </div>
              <div className="text-xs text-muted">{booking.flight?.departure_time ? formatDate(booking.flight.departure_time) : ''}</div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Departure Time</span>
              <div className="text-lg font-bold text-primary">
                {booking.flight?.departure_time ? formatTime(booking.flight.departure_time) : 'On Schedule'}
              </div>
              <div className="text-xs text-muted">Standard Local Time</div>
            </div>
          </div>

          {/* Passenger & Cabin Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-surface-soft rounded-lg">
              <span className="text-muted block mb-0.5 font-medium">Passenger</span>
              <strong className="text-navy text-sm font-bold block truncate">
                {primaryPassenger?.name || 'Passenger'}
              </strong>
            </div>

            <div className="p-3 bg-surface-soft rounded-lg">
              <span className="text-muted block mb-0.5 font-medium">Cabin Class</span>
              <SeatClassBadge seatClass={booking.seat_class} />
            </div>

            <div className="p-3 bg-surface-soft rounded-lg">
              <span className="text-muted block mb-0.5 font-medium">Assigned Seat</span>
              <strong className="text-navy text-sm font-bold block">
                {primaryPassenger?.seat_number || 'Assigned at Check-in'}
              </strong>
            </div>

            <div className="p-3 bg-surface-soft rounded-lg">
              <span className="text-muted block mb-0.5 font-medium">Total Paid</span>
              <strong className="text-primary text-sm font-bold block">
                <CurrencyDisplay amount={booking.total_price} currency={booking.currency} />
              </strong>
            </div>
          </div>

          {/* Passengers List if group */}
          {booking.passengers && booking.passengers.length > 1 && (
            <div className="border-t border-brandBorder/60 pt-4 space-y-2">
              <span className="text-xs font-bold text-navy uppercase tracking-wider">All Passengers</span>
              <div className="space-y-1">
                {booking.passengers.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center justify-between text-xs py-1.5 px-3 bg-surface-soft rounded">
                    <span className="font-semibold text-navy">{p.name} ({p.email})</span>
                    <span className="font-mono text-muted">Seat: {p.seat_number || 'Standard Auto'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email notice */}
          <div className="p-3.5 bg-sky-50 rounded-lg border border-sky-100 flex items-center gap-3 text-sky-800 text-xs">
            <Mail className="w-4 h-4 shrink-0 text-primary" />
            <span>
              E-ticket and check-in instructions have been sent to <strong>{primaryPassenger?.email || 'your email'}</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-brandBorder bg-surface hover:bg-surface-soft text-navy text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Ticket Summary</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/my-bookings"
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>View in My Bookings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
