import React, { useEffect, useState } from 'react';
import { getWaitlistQueueApi } from '../../api/waitlist';
import type { WaitlistEntryResponse } from '../../types';
import { WaitlistStatus } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { formatDateTime } from '../../utils/formatters';

export const AdminWaitlistPage: React.FC = () => {
  const [entries, setEntries] = useState<WaitlistEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWaitlistQueueApi(
        undefined,
        statusFilter !== 'ALL' ? (statusFilter as WaitlistStatus) : undefined
      );
      setEntries(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch waitlist queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, [statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">Waitlist Queue</h1>
          <p className="text-xs text-muted">Automated priority ranking based on loyalty tier and registration timestamp</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value={WaitlistStatus.WAITING}>Waiting</option>
            <option value={WaitlistStatus.PROMOTED}>Promoted</option>
            <option value={WaitlistStatus.CANCELLED}>Claimed/Cancelled</option>
            <option value={WaitlistStatus.EXPIRED}>Expired</option>
            <option value={WaitlistStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-surface rounded-card border border-brandBorder shadow-card overflow-hidden">
        {loading ? (
          <LoadingState message="Loading waitlist queue from backend..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchWaitlist} />
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted">
            No passengers in the waitlist queue for this selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-brandBorder">
                <tr>
                  <th className="py-3 px-4">Passenger</th>
                  <th className="py-3 px-4">Flight</th>
                  <th className="py-3 px-4">Requested Cabin</th>
                  <th className="py-3 px-4">Loyalty Tier</th>
                  <th className="py-3 px-4">Priority Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Claim Deadline</th>
                  <th className="py-3 px-4">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brandBorder/60">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium">
                      <span className="block text-navy font-bold">{entry.passenger_name}</span>
                      <span className="text-muted text-[11px]">{entry.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-navy">
                      {entry.flight_id?.substring(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <SeatClassBadge seatClass={entry.seat_class} />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-soft text-navy border border-brandBorder/60">
                        {entry.loyalty_tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary">
                      {entry.priority_score} pts
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="py-3.5 px-4 text-muted text-[11px]">
                      {entry.claim_deadline ? formatDateTime(entry.claim_deadline) : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-muted text-[11px]">
                      {formatDateTime(entry.created_at)}
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
