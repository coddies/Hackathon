import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFlightByIdApi, getSeatMapApi } from '../../api/flights';
import {
  updateFlightScheduleApi,
  updateFlightInventoryApi,
  cancelFlightApi,
  getAuditLogsApi,
} from '../../api/admin';
import { getBookingsListApi } from '../../api/bookings';
import type {
  FlightDetailResponse,
  SeatMapResponse,
  BookingResponse,
  AuditLogResponse,
} from '../../types';
import {
  SeatClass,
  FlightStatus,
} from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FlightStatusBadge } from '../../components/ui/FlightStatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeatMapVisual } from '../../components/booking/SeatMapVisual';
import { CancelFlightModal } from '../../components/admin/CancelFlightModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatIsoToInputDateTime,
} from '../../utils/formatters';
import {
  Plane,
  Calendar,
  Layers,
  Armchair,
  Ticket,
  ScrollText,
  AlertTriangle,
  ArrowLeft,
  Save,
} from 'lucide-react';

export const AdminFlightDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [flight, setFlight] = useState<FlightDetailResponse | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapResponse | null>(null);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State: 'overview' | 'schedule' | 'inventory' | 'seatmap' | 'bookings' | 'audit'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'schedule' | 'inventory' | 'seatmap' | 'bookings' | 'audit'
  >('overview');

  // Schedule Form State
  const [schedDep, setSchedDep] = useState('');
  const [schedArr, setSchedArr] = useState('');
  const [schedReason, setSchedReason] = useState('');
  const [schedNotify] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Inventory Editor State
  const [inventoryForm, setInventoryForm] = useState<
    { seat_class: SeatClass; total_seats: number; basic_fare_price: number; flexible_fare_price: number; booking_cutoff_hours?: number }[]
  >([]);
  const [savingInventory, setSavingInventory] = useState(false);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchFlightData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [fData, sData, bData, aData] = await Promise.all([
        getFlightByIdApi(id),
        getSeatMapApi(id).catch(() => null),
        getBookingsListApi({ flight_id: id }).catch(() => []),
        isSuperAdmin ? getAuditLogsApi({ entity_id: id }).catch(() => []) : Promise.resolve([]),
      ]);

      setFlight(fData);
      setSeatMap(sData);
      setBookings(bData);
      setAuditLogs(aData);

      // Populate schedule edit form
      setSchedDep(formatIsoToInputDateTime(fData.departure_time));
      setSchedArr(formatIsoToInputDateTime(fData.arrival_time));

      // Populate inventory form
      if (fData.inventories) {
        setInventoryForm(
          fData.inventories.map((i: any) => ({
            seat_class: i.seat_class,
            total_seats: i.total_seats,
            basic_fare_price: i.basic_fare_price,
            flexible_fare_price: i.flexible_fare_price,
            booking_cutoff_hours: i.booking_cutoff_hours,
          }))
        );
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to retrieve flight details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlightData();
  }, [id, isSuperAdmin]);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flight || !schedReason.trim()) return;

    try {
      setSavingSchedule(true);
      await updateFlightScheduleApi(flight.id, {
        departure_at: new Date(schedDep).toISOString(),
        arrival_at: new Date(schedArr).toISOString(),
        departure_time: new Date(schedDep).toISOString(),
        arrival_time: new Date(schedArr).toISOString(),
        reason: schedReason.trim(),
        notify_passengers: schedNotify,
      });
      showToast('success', 'Flight schedule updated and passengers notified.');
      fetchFlightData();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to update schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flight) return;

    try {
      setSavingInventory(true);
      await updateFlightInventoryApi(flight.id, inventoryForm);
      showToast('success', 'Cabin inventory & fare structure saved.');
      fetchFlightData();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to update inventory.');
    } finally {
      setSavingInventory(false);
    }
  };

  const handleCancelFlight = async (reason: string) => {
    if (!flight) return;
    try {
      await cancelFlightApi(flight.id, { reason });
      showToast('success', 'Flight cancelled successfully.');
      fetchFlightData();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Cancellation failed.');
      throw err;
    }
  };

  if (loading) return <LoadingState message="Loading flight matrix specifications..." />;
  if (error || !flight) return <ErrorState message={error || 'Flight not found'} onRetry={fetchFlightData} />;

  const isCancelled = flight.status === FlightStatus.CANCELLED;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/flights"
            className="p-2 rounded-lg border border-brandBorder bg-surface hover:bg-surface-soft text-muted hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-navy tracking-tight">Flight {flight.flight_number}</h1>
              <FlightStatusBadge status={flight.status} />
            </div>
            <p className="text-xs text-muted">
              {flight.origin} → {flight.destination} • {formatDate(flight.departure_time)}
            </p>
          </div>
        </div>

        {isSuperAdmin && !isCancelled && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-4 py-2 bg-danger/10 hover:bg-danger text-danger hover:text-white text-xs font-bold rounded-lg border border-danger/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cancel Flight</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-brandBorder/80 pb-px overflow-x-auto text-xs font-semibold">
        {[
          { key: 'overview', label: 'Overview', icon: Plane },
          { key: 'schedule', label: 'Schedule', icon: Calendar },
          { key: 'inventory', label: 'Inventory & Fares', icon: Layers },
          { key: 'seatmap', label: 'Seat Map Visual', icon: Armchair },
          { key: 'bookings', label: `Bookings (${bookings.length})`, icon: Ticket },
          ...(isSuperAdmin ? [{ key: 'audit', label: `Audit Log (${auditLogs.length})`, icon: ScrollText }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 px-4 rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-bold bg-surface'
                  : 'border-transparent text-muted hover:text-navy hover:bg-surface-soft'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          {/* Flight Summary Card */}
          <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider border-b border-brandBorder/60 pb-3">
              Route & Timetable
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Origin Airport:</span>
                <span className="font-bold text-navy">{flight.origin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Destination Airport:</span>
                <span className="font-bold text-navy">{flight.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Departure:</span>
                <span className="font-semibold text-navy">{formatDateTime(flight.departure_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Arrival:</span>
                <span className="font-semibold text-navy">{formatDateTime(flight.arrival_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Duration:</span>
                <span className="font-bold text-primary">
                  {formatDuration(flight.departure_time, flight.arrival_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Aircraft Capacity:</span>
                <span className="font-bold text-navy">{flight.capacity} Passengers</span>
              </div>
            </div>
          </div>

          {/* Cabin Breakdown Card */}
          <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider border-b border-brandBorder/60 pb-3">
              Cabin Class Breakdown
            </h2>
            <div className="space-y-3">
              {flight.inventories?.map((inv) => (
                <div
                  key={inv.id || inv.seat_class}
                  className="p-3.5 bg-surface-soft rounded-lg border border-brandBorder/60 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <SeatClassBadge seatClass={inv.seat_class} />
                    <span className="font-bold text-navy">
                      {inv.available_seats} / {inv.total_seats} Available
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted text-[11px] pt-1 border-t border-brandBorder/40">
                    <span>Basic Fare: <strong>${inv.basic_fare_price}</strong></span>
                    <span>Flexible Fare: <strong>${inv.flexible_fare_price}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE */}
      {activeTab === 'schedule' && (
        <form onSubmit={handleSaveSchedule} className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6 max-w-2xl animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-navy">Modify Flight Schedule</h2>
            <p className="text-xs text-muted">
              Updating departure or arrival triggers automated passenger email updates via n8n automation pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                New Departure Datetime <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                required
                disabled={!isSuperAdmin}
                value={schedDep}
                onChange={(e) => setSchedDep(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-surface-soft"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                New Arrival Datetime <span className="text-danger">*</span>
              </label>
              <input
                type="datetime-local"
                required
                disabled={!isSuperAdmin}
                value={schedArr}
                onChange={(e) => setSchedArr(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-surface-soft"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">
              Reason for Schedule Change <span className="text-danger">*</span>
            </label>
            <textarea
              required
              rows={3}
              disabled={!isSuperAdmin}
              placeholder="e.g. ATC runway delay, weather routing change, aircraft technical clearance..."
              value={schedReason}
              onChange={(e) => setSchedReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy resize-none disabled:bg-surface-soft"
            />
          </div>

          {isSuperAdmin && (
            <div className="flex items-center justify-end pt-4 border-t border-brandBorder">
              <button
                type="submit"
                disabled={savingSchedule || !schedReason.trim()}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSchedule ? 'Saving Schedule...' : 'Save Schedule Change'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 'inventory' && (
        <form onSubmit={handleSaveInventory} className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-navy">Cabin Inventory & Pricing Structure</h2>
            <p className="text-xs text-muted">
              Adjust seats allocated per cabin class and fare rates. Total seats must not be reduced below currently booked count.
            </p>
          </div>

          <div className="space-y-4">
            {inventoryForm.map((inv, idx) => (
              <div key={inv.seat_class} className="p-4 bg-surface-soft rounded-lg border border-brandBorder/60 space-y-3">
                <div className="flex items-center justify-between">
                  <SeatClassBadge seatClass={inv.seat_class} />
                  <span className="text-xs font-bold text-navy">{inv.seat_class} Class</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-1">Total Seats</label>
                    <input
                      type="number"
                      min="1"
                      disabled={!isSuperAdmin}
                      value={inv.total_seats}
                      onChange={(e) => {
                        const updated = [...inventoryForm];
                        updated[idx].total_seats = Number(e.target.value);
                        setInventoryForm(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded border border-brandBorder bg-surface text-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-1">Basic Fare ($)</label>
                    <input
                      type="number"
                      min="1"
                      disabled={!isSuperAdmin}
                      value={inv.basic_fare_price}
                      onChange={(e) => {
                        const updated = [...inventoryForm];
                        updated[idx].basic_fare_price = Number(e.target.value);
                        setInventoryForm(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded border border-brandBorder bg-surface text-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-1">Flexible Fare ($)</label>
                    <input
                      type="number"
                      min="1"
                      disabled={!isSuperAdmin}
                      value={inv.flexible_fare_price}
                      onChange={(e) => {
                        const updated = [...inventoryForm];
                        updated[idx].flexible_fare_price = Number(e.target.value);
                        setInventoryForm(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded border border-brandBorder bg-surface text-navy"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted block mb-1">Cutoff (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      disabled={!isSuperAdmin}
                      value={inv.booking_cutoff_hours || 0}
                      onChange={(e) => {
                        const updated = [...inventoryForm];
                        updated[idx].booking_cutoff_hours = Number(e.target.value);
                        setInventoryForm(updated);
                      }}
                      className="w-full px-2.5 py-1.5 rounded border border-brandBorder bg-surface text-navy"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isSuperAdmin && (
            <div className="flex items-center justify-end pt-4 border-t border-brandBorder">
              <button
                type="submit"
                disabled={savingInventory}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingInventory ? 'Saving...' : 'Save Inventory Matrix'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 4: SEAT MAP */}
      {activeTab === 'seatmap' && (
        <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-navy">Aircraft Seat Map & Physical Status</h2>
            <p className="text-xs text-muted">Real-time status of individual physical aircraft seats.</p>
          </div>

          <SeatMapVisual seatMap={seatMap} isInteractive={false} />
        </div>
      )}

      {/* TAB 5: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-4 animate-in fade-in">
          <h2 className="text-base font-bold text-navy">Confirmed & Held Bookings ({bookings.length})</h2>

          {bookings.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted">No passenger bookings on this flight yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-brandBorder">
                  <tr>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Passenger</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brandBorder/60">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-soft/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-navy">{b.booking_reference}</td>
                      <td className="py-2.5 px-3 font-medium">{b.passengers?.[0]?.name || 'Passenger'}</td>
                      <td className="py-2.5 px-3"><SeatClassBadge seatClass={b.seat_class} /></td>
                      <td className="py-2.5 px-3"><StatusBadge status={b.status} /></td>
                      <td className="py-2.5 px-3 text-right font-bold text-navy">${b.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-4 animate-in fade-in">
          <h2 className="text-base font-bold text-navy">Flight Operational Audit Logs ({auditLogs.length})</h2>

          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted">No audit mutations logged for this flight.</div>
          ) : (
            <div className="space-y-3 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-surface-soft rounded-lg border border-brandBorder/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy uppercase text-[11px]">{log.action}</span>
                    <span className="text-[10px] text-muted">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="text-brandText">{log.reason || 'Operation performed'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelFlightModal
          flight={flight}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onSubmit={handleCancelFlight}
        />
      )}
    </div>
  );
};
