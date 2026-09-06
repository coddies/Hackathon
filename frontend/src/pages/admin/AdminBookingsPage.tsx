import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBookingsListApi } from '../../api/bookings';
import type { BookingResponse } from '../../types';
import { BookingStatus } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { formatDateTime } from '../../utils/formatters';
import { Search } from 'lucide-react';

export const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBookingsListApi({
        status: statusFilter !== 'ALL' ? (statusFilter as BookingStatus) : undefined,
      });
      setBookings(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load booking operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const filtered = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    const matchesRef = b.booking_reference?.toLowerCase().includes(term);
    const matchesFlight = b.flight?.flight_number?.toLowerCase().includes(term);
    const matchesPassenger = b.passengers?.some((p) =>
      p.name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term)
    );
    return matchesRef || matchesFlight || matchesPassenger;
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-navy tracking-tight">Booking Operations</h1>
        <p className="text-xs text-muted">Monitor confirmed tickets, active seat holds, and cancellations across all flights</p>
      </div>

      {/* Filter / Search */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by reference (SK-...), flight number, or passenger name/email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value={BookingStatus.CONFIRMED}>Confirmed</option>
            <option value={BookingStatus.HELD}>Held</option>
            <option value={BookingStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card overflow-hidden">
        {loading ? (
          <LoadingState message="Loading passenger reservations from backend..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchBookings} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted">No bookings match the search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-brandBorder">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Primary Passenger</th>
                  <th className="py-3 px-4">Flight</th>
                  <th className="py-3 px-4">Cabin</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Fare Rule</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Created Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brandBorder/60">
                {filtered.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy">{booking.booking_reference}</td>
                    <td className="py-3 px-4 font-medium">
                      <span className="block text-navy">{booking.passengers?.[0]?.name || 'Passenger'}</span>
                      <span className="text-muted text-[11px]">{booking.passengers?.[0]?.email}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-navy">
                      {booking.flight?.flight_number || 'SK-FLIGHT'}
                    </td>
                    <td className="py-3 px-4">
                      <SeatClassBadge seatClass={booking.seat_class} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="py-3 px-4 text-[11px] text-muted">
                      {booking.cancellation_policy?.replace(/_/g, ' ') || 'STANDARD'}
                    </td>
                    <td className="py-3 px-4 font-bold text-navy">
                      <CurrencyDisplay amount={booking.total_price} currency={booking.currency} />
                    </td>
                    <td className="py-3 px-4 text-muted text-[11px]">
                      {formatDateTime(booking.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/my-bookings/${booking.booking_reference}`}
                        className="px-2.5 py-1 bg-surface-soft hover:bg-primary/10 text-primary rounded font-semibold text-[11px]"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
