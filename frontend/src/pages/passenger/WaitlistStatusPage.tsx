import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWaitlistStatusApi } from '../../api/waitlist';
import type { WaitlistEntryResponse } from '../../types';
import { WaitlistStatus } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { formatDateTime } from '../../utils/formatters';
import { Users, CheckCircle, ArrowLeft, Shield } from 'lucide-react';

export const WaitlistStatusPage: React.FC = () => {
  const { waitlistId } = useParams<{ waitlistId: string }>();
  const [entry, setEntry] = useState<WaitlistEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!waitlistId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getWaitlistStatusApi(waitlistId);
        setEntry(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Unable to find waitlist record.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [waitlistId]);

  if (loading) return <LoadingState message="Checking your live waitlist priority status..." />;
  if (error || !entry) return <ErrorState message={error || 'Waitlist entry not found'} onRetry={() => window.location.reload()} />;

  const isPromoted = entry.status === WaitlistStatus.PROMOTED;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-xs font-semibold text-muted hover:text-navy flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <StatusBadge status={entry.status} />
      </div>

      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-brandBorder/60 pb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Waitlist Queue Position</h1>
            <p className="text-xs text-muted">Tracking automated seat release priority</p>
          </div>
        </div>

        {isPromoted && (
          <div className="p-4 bg-sky-50 rounded-card border border-primary/30 flex items-start gap-3 text-primary">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-navy text-sm block">You Have Been Promoted!</span>
              <p>
                A seat opened up in your selected class. {entry.claim_deadline ? `Claim deadline: ${formatDateTime(entry.claim_deadline)}` : 'Please complete your booking immediately.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-surface-soft rounded-lg space-y-1">
            <span className="text-muted block">Passenger Name</span>
            <span className="text-sm font-bold text-navy block">{entry.passenger_name}</span>
            <span className="text-muted text-[11px]">{entry.email}</span>
          </div>

          <div className="p-4 bg-surface-soft rounded-lg space-y-1">
            <span className="text-muted block">Requested Cabin Class</span>
            <SeatClassBadge seatClass={entry.seat_class} />
            <span className="text-muted text-[11px] block mt-1">Loyalty Tier: {entry.loyalty_tier}</span>
          </div>

          <div className="p-4 bg-surface-soft rounded-lg space-y-1">
            <span className="text-muted block">Calculated Priority Score</span>
            <span className="text-sm font-bold text-primary block">{entry.priority_score} pts</span>
          </div>

          <div className="p-4 bg-surface-soft rounded-lg space-y-1">
            <span className="text-muted block">Registered Time</span>
            <span className="text-sm font-medium text-navy block">{formatDateTime(entry.created_at)}</span>
          </div>
        </div>

        <div className="p-4 bg-surface-soft/60 rounded-lg border border-brandBorder/60 text-xs text-muted flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span>
            Our automated n8n engine monitors cancellations and seat holds in real-time. You will receive an instant email notification the moment a seat is released for your rank.
          </span>
        </div>
      </div>
    </div>
  );
};
