import React, { useState } from 'react';
import type { FlightDetailResponse } from '../../types';
import { Calendar, X } from 'lucide-react';
import { formatIsoToInputDateTime } from '../../utils/formatters';

interface ScheduleModalProps {
  flight: FlightDetailResponse;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    departure_time: string;
    arrival_time: string;
    reason: string;
    notify_passengers: boolean;
  }) => Promise<void>;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  flight,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [departureTime, setDepartureTime] = useState(
    formatIsoToInputDateTime(flight.departure_time)
  );
  const [arrivalTime, setArrivalTime] = useState(
    formatIsoToInputDateTime(flight.arrival_time)
  );
  const [reason, setReason] = useState('');
  const [notifyPassengers, setNotifyPassengers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      setSubmitting(true);
      await onSubmit({
        departure_time: new Date(departureTime).toISOString(),
        arrival_time: new Date(arrivalTime).toISOString(),
        reason: reason.trim(),
        notify_passengers: notifyPassengers,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-xs p-4">
      <div className="bg-surface rounded-card border border-brandBorder shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-brandBorder flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy">Update Flight Schedule</h3>
              <p className="text-xs text-muted">Flight {flight.flight_number} ({flight.origin} → {flight.destination})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-navy p-1 rounded-lg hover:bg-surface-soft">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                New Departure Datetime
              </label>
              <input
                type="datetime-local"
                required
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                New Arrival Datetime
              </label>
              <input
                type="datetime-local"
                required
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              placeholder="e.g., Weather delay, Air Traffic Control directive, Aircraft maintenance turnaround..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          <div className="p-3 bg-surface-soft rounded-lg border border-brandBorder/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notify"
                checked={notifyPassengers}
                onChange={(e) => setNotifyPassengers(e.target.checked)}
                className="rounded border-brandBorder text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="notify" className="text-xs font-medium text-navy cursor-pointer">
                Notify confirmed passengers via automated email dispatch
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-brandBorder">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-brandText hover:bg-surface-soft rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-5 py-2 text-xs font-semibold bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Applying Change...' : 'Save Schedule Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
