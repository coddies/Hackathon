import React from 'react';
import { ShieldCheck, Zap, RefreshCw } from 'lucide-react';

export const TrustCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
      <div className="bg-white p-6 rounded-2xl border border-brandBorder shadow-subtle flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="text-base font-bold text-navy">Live Seat Availability</h4>
          <p className="text-xs text-brandText-muted mt-1 leading-relaxed">
            Atomic inventory locking guarantees your seats are held accurately in real time with zero double bookings.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-brandBorder shadow-subtle flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
          <RefreshCw className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-base font-bold text-navy">Flexible Fare Options</h4>
          <p className="text-xs text-brandText-muted mt-1 leading-relaxed">
            Choose between budget-friendly Basic fares or change-friendly Flexible tickets with instant seat selection.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-brandBorder shadow-subtle flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-base font-bold text-navy">Transparent Booking Status</h4>
          <p className="text-xs text-brandText-muted mt-1 leading-relaxed">
            Clear flight statuses, automated refund calculations, and full audit tracking for every step of your travel.
          </p>
        </div>
      </div>
    </div>
  );
};
