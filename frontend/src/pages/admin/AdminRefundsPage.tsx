import React, { useEffect, useState } from 'react';
import { getRefundsQueueApi, processRefundApi, RefundStatus } from '../../api/refunds';
import type { RefundResponse } from '../../api/refunds';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';
import { RotateCcw, AlertTriangle, CheckCircle, Clock, Check } from 'lucide-react';

export const AdminRefundsPage: React.FC = () => {
  const { showToast } = useToast();
  const [refunds, setRefunds] = useState<RefundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ESCALATED' | 'COMPLETED'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRefundsQueueApi(
        activeTab === 'ALL' || activeTab === 'ESCALATED' ? undefined : (activeTab as RefundStatus)
      );
      setRefunds(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to retrieve refunds queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [activeTab]);

  const handleProcessRefund = async (refundId: string, approved: boolean) => {
    try {
      setProcessingId(refundId);
      await processRefundApi(refundId, {
        approved,
        reason: approved ? 'Refund processed and approved by operations agent' : 'Refund rejected according to fare policy rules',
      });
      showToast('success', approved ? 'Refund approved and disbursed.' : 'Refund claim rejected.');
      fetchRefunds();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to update refund status.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = refunds.filter((r) => r.status === RefundStatus.PENDING).length;
  const escalatedCount = refunds.filter((r) => r.is_escalated).length;
  const completedCount = refunds.filter((r) => r.status === RefundStatus.COMPLETED).length;

  const filteredRefunds = refunds.filter((r) => {
    if (activeTab === 'PENDING') return r.status === RefundStatus.PENDING;
    if (activeTab === 'ESCALATED') return r.is_escalated;
    if (activeTab === 'COMPLETED') return r.status === RefundStatus.COMPLETED;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-navy tracking-tight">Refund Queue</h1>
        <p className="text-xs text-muted">Review, escalate, and authorize customer refund disbursements</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`p-4 rounded-card border text-left transition-all ${
            activeTab === 'PENDING'
              ? 'bg-amber-50/50 border-warning ring-2 ring-warning/20'
              : 'bg-surface border-brandBorder hover:border-warning/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-warning">Pending Review</span>
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-bold text-navy">{pendingCount}</div>
          <span className="text-[11px] text-muted">Requires operator action</span>
        </button>

        <button
          onClick={() => setActiveTab('ESCALATED')}
          className={`p-4 rounded-card border text-left transition-all ${
            activeTab === 'ESCALATED'
              ? 'bg-red-50/50 border-danger ring-2 ring-danger/20'
              : 'bg-surface border-brandBorder hover:border-danger/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-danger">Escalated Claims</span>
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <div className="text-2xl font-bold text-navy">{escalatedCount}</div>
          <span className="text-[11px] text-muted">Super Admin escalation</span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-4 rounded-card border text-left transition-all ${
            activeTab === 'COMPLETED'
              ? 'bg-emerald-50/50 border-success ring-2 ring-success/20'
              : 'bg-surface border-brandBorder hover:border-success/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-success">Processed / Paid</span>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-navy">{completedCount}</div>
          <span className="text-[11px] text-muted">Settled claims</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card overflow-hidden">
        <div className="p-4 border-b border-brandBorder/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
              Refund Claims List
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
              activeTab === 'ALL' ? 'bg-primary text-white' : 'text-muted hover:text-navy'
            }`}
          >
            Show All
          </button>
        </div>

        {loading ? (
          <LoadingState message="Checking refunds queue..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchRefunds} />
        ) : filteredRefunds.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted">
            No refund claims in this queue category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-soft text-muted font-semibold uppercase tracking-wider border-b border-brandBorder">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Refund Amount</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Escalation</th>
                  <th className="py-3 px-4">Claim Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brandBorder/60">
                {filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-navy">
                      {refund.booking_reference || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-navy">
                      <CurrencyDisplay amount={refund.amount} currency={refund.currency} />
                    </td>
                    <td className="py-3.5 px-4 text-muted text-[11px] max-w-xs truncate">
                      {refund.reason || 'Flight cancellation / voluntary passenger claim'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={refund.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {refund.is_escalated ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-danger">
                          Escalated (Score: {refund.escalation_score || 'High'})
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">Standard</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted text-[11px]">
                      {formatDateTime(refund.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {refund.status === RefundStatus.PENDING ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleProcessRefund(refund.id, true)}
                            disabled={processingId === refund.id}
                            className="px-2.5 py-1 bg-success hover:bg-success/90 text-white rounded font-bold text-[11px] flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleProcessRefund(refund.id, false)}
                            disabled={processingId === refund.id}
                            className="px-2 py-1 bg-surface-soft hover:bg-danger/10 text-danger rounded font-semibold text-[11px]"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-[11px] font-medium">Completed</span>
                      )}
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
