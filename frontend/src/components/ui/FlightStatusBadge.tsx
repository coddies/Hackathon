import React from 'react';
import { FlightStatus } from '../../types';
import { Plane, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export const FlightStatusBadge: React.FC<{ status: FlightStatus | string }> = ({ status }) => {
  const s = (status || 'SCHEDULED').toUpperCase();

  switch (s) {
    case 'SCHEDULED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Clock className="w-3.5 h-3.5 text-sky-500" />
          Scheduled
        </span>
      );
    case 'DEPARTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Plane className="w-3.5 h-3.5 text-indigo-500 transform -rotate-45" />
          Departed
        </span>
      );
    case 'ARRIVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          Arrived
        </span>
      );
    case 'DELAYED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          Delayed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {s}
        </span>
      );
  }
};
