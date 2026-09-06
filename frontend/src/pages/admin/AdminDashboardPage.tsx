import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboardStatsApi, getAuditLogsApi } from '../../api/admin';
import { searchFlightsApi } from '../../api/flights';
import { getRefundsQueueApi, RefundStatus, type RefundResponse } from '../../api/refunds';
import { getWaitlistQueueApi } from '../../api/waitlist';
import type {
  DashboardStatsResponse,
  FlightListItem,
  WaitlistEntryResponse,
  AuditLogResponse,
} from '../../types';
import {
  FlightStatus,
  WaitlistStatus,
} from '../../types';
import { MetricCard } from '../../components/admin/MetricCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { FlightStatusBadge } from '../../components/ui/FlightStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatTime, formatDateTime } from '../../utils/formatters';
import {
  Plane,
  Ticket,
  Lock,
  Users,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  PlaneTakeoff,
  Activity,
  PlusCircle,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [flights, setFlights] = useState<FlightListItem[]>([]);
  const [refunds, setRefunds] = useState<RefundResponse[]>([]);
  const [waitlists, setWaitlists] = useState<WaitlistEntryResponse[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, flightsData, refundsData, waitlistData, logsData] = await Promise.all([
          getAdminDashboardStatsApi().catch(() => null),
          searchFlightsApi({}).catch(() => []),
          getRefundsQueueApi().catch(() => []),
          getWaitlistQueueApi().catch(() => []),
          isSuperAdmin ? getAuditLogsApi({ limit: 5 }).catch(() => []) : Promise.resolve([]),
        ]);

        setStats(statsData);
        setFlights(flightsData.slice(0, 5));
        setRefunds(refundsData);
        setWaitlists(waitlistData);
        setAuditLogs(logsData);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isSuperAdmin]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const pendingRefundsCount = stats?.pending_refunds ?? refunds.filter(r => r.status === RefundStatus.PENDING).length;
  const promotedWaitlistCount = waitlists.filter(w => w.status === WaitlistStatus.PROMOTED).length;
  const cancelledFlightsCount = flights.filter(f => f.status === FlightStatus.CANCELLED).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">
            {greeting()}, {user?.full_name || 'Operations Agent'}
          </h1>
          <p className="text-xs text-muted">
            Flight Operations Command Center — Real-time Railway FastAPI backend metrics
          </p>
        </div>

        {isSuperAdmin && (
          <Link
            to="/admin/flights/new"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Flight</span>
          </Link>
        )}
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Scheduled Flights"
          value={stats?.scheduled_flights ?? flights.length}
          icon={Plane}
          badgeText="Active Matrix"
          badgeType="info"
          loading={loading}
        />
        <MetricCard
          title="Confirmed Bookings"
          value={stats?.confirmed_bookings ?? 'Live'}
          icon={Ticket}
          badgeText="Ticketed"
          badgeType="success"
          loading={loading}
        />
        <MetricCard
          title="Seats Currently Held"
          value={stats?.seats_currently_held ?? 0}
          icon={Lock}
          badgeText="15m Expiry"
          badgeType="warning"
          loading={loading}
        />
        <MetricCard
          title="Waitlist Entries"
          value={stats?.waitlist_entries ?? waitlists.length}
          icon={Users}
          badgeText="Queue Active"
          badgeType="default"
          loading={loading}
        />
        <MetricCard
          title="Pending Refunds"
          value={pendingRefundsCount}
          icon={RotateCcw}
          badgeText={pendingRefundsCount > 0 ? 'Requires Action' : 'Clear'}
          badgeType={pendingRefundsCount > 0 ? 'danger' : 'success'}
          loading={loading}
        />
      </div>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Flight Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface rounded-card border border-brandBorder shadow-card p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-brandBorder/60">
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
                  Active Flight Operations
                </h2>
              </div>
              <Link
                to="/admin/flights"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>View All Flights</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <LoadingState message="Loading flight matrix..." />
            ) : flights.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted">
                No flights scheduled yet. Use "Create Flight" to dispatch the first route.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-brandBorder">
                    <tr>
                      <th className="py-2.5 px-3">Flight #</th>
                      <th className="py-2.5 px-3">Route</th>
                      <th className="py-2.5 px-3">Departure</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brandBorder/60">
                    {flights.map((flight) => (
                      <tr key={flight.id} className="hover:bg-surface-soft/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-navy">{flight.flight_number}</td>
                        <td className="py-3 px-3 font-medium">
                          {flight.origin} → {flight.destination}
                        </td>
                        <td className="py-3 px-3 text-muted">
                          {formatDate(flight.departure_time)} at {formatTime(flight.departure_time)}
                        </td>
                        <td className="py-3 px-3">
                          <FlightStatusBadge status={flight.status} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/admin/flights/${flight.id}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Manage
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

        {/* Right 1 Col: Attention Required & Audit Feed */}
        <div className="space-y-6">
          {/* Attention Required Panel */}
          <div className="bg-surface rounded-card border border-brandBorder shadow-card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-brandBorder/60">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
                Attention Required
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <Link
                to="/admin/refunds"
                className="p-3 rounded-lg bg-surface-soft hover:bg-red-50/50 border border-brandBorder/60 flex items-center justify-between transition-colors block"
              >
                <div>
                  <span className="font-bold text-navy block">Pending Refunds</span>
                  <span className="text-muted text-[11px]">{pendingRefundsCount} refund claims awaiting operator review</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-warning">
                  {pendingRefundsCount}
                </span>
              </Link>

              <Link
                to="/admin/waitlist"
                className="p-3 rounded-lg bg-surface-soft hover:bg-sky-50/50 border border-brandBorder/60 flex items-center justify-between transition-colors block"
              >
                <div>
                  <span className="font-bold text-navy block">Promoted Passengers</span>
                  <span className="text-muted text-[11px]">{promotedWaitlistCount} promoted waitlist claims active</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-info">
                  {promotedWaitlistCount}
                </span>
              </Link>

              <Link
                to="/admin/flights"
                className="p-3 rounded-lg bg-surface-soft hover:bg-red-50/50 border border-brandBorder/60 flex items-center justify-between transition-colors block"
              >
                <div>
                  <span className="font-bold text-navy block">Cancelled Flights</span>
                  <span className="text-muted text-[11px]">{cancelledFlightsCount} grounded routes</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-danger">
                  {cancelledFlightsCount}
                </span>
              </Link>
            </div>
          </div>

          {/* Recent Audit Log Activity */}
          {isSuperAdmin && (
            <div className="bg-surface rounded-card border border-brandBorder shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-brandBorder/60">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
                    Recent Activity
                  </h2>
                </div>
                <Link to="/admin/audit-logs" className="text-xs font-semibold text-primary hover:underline">
                  All Logs
                </Link>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No recent operational mutations logged.</p>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="p-2.5 bg-surface-soft/60 rounded border border-brandBorder/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-navy uppercase text-[10px] tracking-wider">{log.action}</span>
                        <span className="text-[10px] text-muted">{formatDateTime(log.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-brandText truncate">
                        {log.reason || `Modified ${log.entity_type} #${log.entity_id?.substring(0, 8)}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
