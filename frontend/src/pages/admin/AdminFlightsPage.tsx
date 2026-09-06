import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchFlightsApi, getFlightByIdApi } from '../../api/flights';
import { updateFlightScheduleApi, cancelFlightApi } from '../../api/admin';
import type { FlightListItem, FlightDetailResponse } from '../../types';
import { FlightStatus } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FlightStatusBadge } from '../../components/ui/FlightStatusBadge';
import { ScheduleModal } from '../../components/admin/ScheduleModal';
import { CancelFlightModal } from '../../components/admin/CancelFlightModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime } from '../../utils/formatters';
import {
  PlusCircle,
  Search,
} from 'lucide-react';

export const AdminFlightsPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [flights, setFlights] = useState<FlightListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [activeFlightDetail, setActiveFlightDetail] = useState<FlightDetailResponse | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchFlightsApi({});
      setFlights(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch flight list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const handleOpenScheduleModal = async (flightId: string) => {
    try {
      const detail = await getFlightByIdApi(flightId);
      setActiveFlightDetail(detail);
      setShowScheduleModal(true);
    } catch (err: any) {
      showToast('error', 'Unable to fetch flight details for schedule update.');
    }
  };

  const handleOpenCancelModal = async (flightId: string) => {
    try {
      const detail = await getFlightByIdApi(flightId);
      setActiveFlightDetail(detail);
      setShowCancelModal(true);
    } catch (err: any) {
      showToast('error', 'Unable to fetch flight details for cancellation.');
    }
  };

  const handleScheduleSubmit = async (data: {
    departure_time: string;
    arrival_time: string;
    reason: string;
    notify_passengers: boolean;
  }) => {
    if (!activeFlightDetail) return;
    try {
      await updateFlightScheduleApi(activeFlightDetail.id, data);
      showToast('success', `Schedule for flight ${activeFlightDetail.flight_number} updated successfully.`);
      fetchFlights();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to update schedule.');
      throw err;
    }
  };

  const handleCancelSubmit = async (reason: string) => {
    if (!activeFlightDetail) return;
    try {
      await cancelFlightApi(activeFlightDetail.id, { reason });
      showToast('success', `Flight ${activeFlightDetail.flight_number} cancelled.`);
      fetchFlights();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to cancel flight.');
      throw err;
    }
  };

  const filteredFlights = flights.filter((flight) => {
    const matchesSearch =
      flight.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.destination.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || flight.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Flight Operations</h1>
          <p className="text-xs text-muted">Manage scheduled routes, seat allocations, timetables, and groundings</p>
        </div>

        {isSuperAdmin && (
          <Link
            to="/admin/flights/new"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Flight</span>
          </Link>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by flight number (e.g. SK-100) or airport code (LHE, DXB)..."
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
            <option value={FlightStatus.SCHEDULED}>Scheduled</option>
            <option value={FlightStatus.DELAYED}>Delayed</option>
            <option value={FlightStatus.DEPARTED}>Departed</option>
            <option value={FlightStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card overflow-hidden">
        {loading ? (
          <LoadingState message="Retrieving live flight records from backend..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchFlights} />
        ) : filteredFlights.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted">
            No flights match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-brandBorder">
                <tr>
                  <th className="py-3 px-4">Flight Number</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Departure Time</th>
                  <th className="py-3 px-4">Arrival Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brandBorder/60">
                {filteredFlights.map((flight) => {
                  const dep = flight.departure_time || flight.departure_at;
                  const arr = flight.arrival_time || flight.arrival_at;
                  return (
                    <tr key={flight.id} className="hover:bg-surface-soft/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-navy">{flight.flight_number}</td>
                      <td className="py-3.5 px-4 font-medium">
                        <span className="font-semibold text-navy">{flight.origin}</span>
                        <span className="text-muted mx-1.5">→</span>
                        <span className="font-semibold text-navy">{flight.destination}</span>
                      </td>
                      <td className="py-3.5 px-4 text-muted">
                        {formatDate(dep)} at {formatTime(dep)}
                      </td>
                      <td className="py-3.5 px-4 text-muted">
                        {formatDate(arr)} at {formatTime(arr)}
                      </td>
                      <td className="py-3.5 px-4">
                        <FlightStatusBadge status={flight.status} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-navy">
                        {flight.capacity ?? '-'} Seats
                      </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/flights/${flight.id}`}
                          className="px-2.5 py-1 bg-surface-soft hover:bg-primary/10 text-primary rounded font-semibold text-[11px] transition-colors"
                        >
                          Manage
                        </Link>

                        {isSuperAdmin && flight.status !== FlightStatus.CANCELLED && (
                          <>
                            <button
                              onClick={() => handleOpenScheduleModal(flight.id)}
                              className="px-2 py-1 text-muted hover:text-navy text-[11px] font-medium"
                              title="Reschedule Flight"
                            >
                              Schedule
                            </button>
                            <button
                              onClick={() => handleOpenCancelModal(flight.id)}
                              className="px-2 py-1 text-danger hover:bg-red-50 text-[11px] font-semibold rounded"
                              title="Cancel Flight"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Edit Modal */}
      {showScheduleModal && activeFlightDetail && (
        <ScheduleModal
          flight={activeFlightDetail}
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSubmit={handleScheduleSubmit}
        />
      )}

      {/* Cancel Flight Modal */}
      {showCancelModal && activeFlightDetail && (
        <CancelFlightModal
          flight={activeFlightDetail}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onSubmit={handleCancelSubmit}
        />
      )}
    </div>
  );
};
