import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBookingByReferenceApi, cancelBookingApi } from '../../api/bookings';
import type { BookingResponse } from '../../types';
import { BookingStatus, CancellationPolicy } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';
import {
  Plane,
  ShieldAlert,
  ArrowLeft,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const BookingDetailPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchBookingDetails = async () => {
    if (!reference) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getBookingByReferenceApi(reference);
      setBooking(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to retrieve booking information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [reference]);

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    try {
      setCancelling(true);
      await cancelBookingApi(booking.booking_reference, {
        reason: cancelReason.trim() || 'Passenger requested cancellation',
      });

      showToast('success', 'Booking cancelled successfully.');
      fetchBookingDetails();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Unable to cancel this reservation.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingState message="Fetching booking specification and refund status..." />;
  if (error || !booking) return <ErrorState message={error || 'Booking not found'} onRetry={fetchBookingDetails} />;

  const isCancelled = booking.status === BookingStatus.CANCELLED;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Navigation and Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/my-bookings"
          className="text-xs font-semibold text-muted hover:text-navy flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Reservations</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Status:</span>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      {/* Main Reservation Card */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brandBorder/60 pb-5">
          <div>
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Booking Reference</span>
            <div className="text-2xl font-mono font-extrabold text-navy">{booking.booking_reference}</div>
          </div>

          <div className="flex items-center gap-2">
            <SeatClassBadge seatClass={booking.seat_class} />
            <span className="text-xs font-semibold px-2.5 py-1 bg-surface-soft text-navy rounded border border-brandBorder">
              {booking.cancellation_policy?.replace(/_/g, ' ') || 'STANDARD FARE'}
            </span>
          </div>
        </div>

        {/* Flight Summary */}
        <div className="p-5 bg-surface-soft rounded-card border border-brandBorder/60 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-navy">
            <Plane className="w-4 h-4 text-primary" />
            <span>Flight Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted block">Flight Number</span>
              <span className="text-sm font-bold text-navy">{booking.flight?.flight_number || 'SK-FLIGHT'}</span>
            </div>
            <div>
              <span className="text-muted block">Route</span>
              <span className="text-sm font-bold text-navy">{booking.flight?.origin} → {booking.flight?.destination}</span>
            </div>
            <div>
              <span className="text-muted block">Departure</span>
              <span className="text-sm font-bold text-navy">
                {booking.flight?.departure_time ? formatDateTime(booking.flight.departure_time) : 'Scheduled'}
              </span>
            </div>
          </div>
        </div>

        {/* Passenger Information */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Passenger & Seat Assignment</h3>
          <div className="border border-brandBorder rounded-lg divide-y divide-brandBorder">
            {booking.passengers && booking.passengers.length > 0 ? (
              booking.passengers.map((passenger, index) => (
                <div key={passenger.id || index} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-navy text-sm">{passenger.name}</div>
                    <div className="text-muted">{passenger.email}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-muted block text-[10px] uppercase">Seat</span>
                      <span className="font-bold text-navy">{passenger.seat_number || 'Assigned at Check-in'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-xs text-muted">No specific passenger records attached.</div>
            )}
          </div>
        </div>

        {/* Cancellation & Refund Outcome Banner */}
        {isCancelled && (
          <div className="p-4 bg-red-50 rounded-card border border-danger/30 space-y-2 text-xs text-danger">
            <div className="flex items-center gap-2 font-bold text-navy">
              <ShieldAlert className="w-4 h-4 text-danger" />
              <span>This reservation has been cancelled</span>
            </div>
            <p className="text-brandText">
              Refund or credit evaluation has been logged with operations under standard airline policies.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-brandBorder flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted">
            Total Ticket Value: <strong className="text-navy text-sm"><CurrencyDisplay amount={booking.total_price} currency={booking.currency} /></strong>
          </div>

          {!isCancelled && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white text-xs font-bold rounded-lg border border-danger/20 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel Reservation</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-card border border-brandBorder shadow-xl max-w-md w-full overflow-hidden animate-in fade-in">
            <div className="p-5 bg-red-50/70 border-b border-danger/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <h3 className="text-base font-bold text-navy">Cancel Booking</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="text-muted hover:text-navy">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelBooking} className="p-6 space-y-4">
              <div className="p-3.5 bg-surface-soft rounded-lg text-xs space-y-2 border border-brandBorder/60">
                <span className="font-bold text-navy block">Cancellation Policy Terms:</span>
                {booking.cancellation_policy === CancellationPolicy.REFUNDABLE && (
                  <p className="text-success font-medium">
                    ✓ Refundable Policy: Cash refund will be initiated minus applicable standard processing fees.
                  </p>
                )}
                {booking.cancellation_policy === CancellationPolicy.CREDIT_ONLY && (
                  <p className="text-primary font-medium">
                    ✓ Flexible Fare: 100% value converted into reusable SkyFlow Travel Credit (12-month validity).
                  </p>
                )}
                {booking.cancellation_policy === CancellationPolicy.NON_REFUNDABLE && (
                  <p className="text-danger font-medium">
                    ⚠ Basic Fare: Non-refundable ticket. No cash refund or travel credit will be issued.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Schedule conflict, medical emergency, change of plans..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brandBorder">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-brandText hover:bg-surface-soft rounded-lg"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2 text-xs font-semibold bg-danger text-white hover:bg-danger/90 rounded-lg transition-colors shadow-xs"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
