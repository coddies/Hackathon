import React, { useState } from 'react';
import type { FlightDetailResponse } from '../../types';
import { AlertOctagon, X, AlertTriangle } from 'lucide-react';

interface CancelFlightModalProps {
  flight: FlightDetailResponse;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const CancelFlightModal: React.FC<CancelFlightModalProps> = ({
  flight,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      setSubmitting(true);
      await onSubmit(reason.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-xs p-4">
      <div className="bg-surface rounded-card border border-danger/30 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 bg-red-50/70 border-b border-danger/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy">Confirm Flight Cancellation</h3>
              <p className="text-xs text-danger font-medium">Critical Operational Action</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-navy p-1 rounded-lg hover:bg-surface-soft">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-amber-50/60 rounded-card border border-warning/30 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-navy">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>Operational Impact on Flight {flight.flight_number}:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-brandText pl-1">
              <li>All active seat holds for this flight will be immediately invalidated.</li>
              <li>Confirmed passenger bookings will transition to cancellation and trigger automated refund / rebooking workflows.</li>
              <li>Waitlist entries will be closed with cancellation notices.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">
              Reason for Cancellation <span className="text-danger">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g., Extreme weather conditions, severe technical fault, operational airspace closure..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-brandBorder">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-brandText hover:bg-surface-soft rounded-lg transition-colors"
            >
              Back to Operations
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-5 py-2 text-xs font-semibold bg-danger text-white hover:bg-danger/90 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Processing Cancellation...' : 'Confirm Flight Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
