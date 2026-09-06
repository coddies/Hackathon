import React from 'react';

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const s = (status || '').toUpperCase();
  const isSmall = size === 'sm';
  const sizeClasses = isSmall ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  let colorClasses = 'bg-slate-50 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (s) {
    case 'CONFIRMED':
    case 'APPROVED':
    case 'COMPLETED':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
      break;
    case 'SCHEDULED':
    case 'PROMOTED':
    case 'DEPARTED':
    case 'ARRIVED':
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
      dotColor = 'bg-sky-500';
      break;
    case 'HELD':
    case 'WAITING':
    case 'PENDING':
    case 'DELAYED':
    case 'REBOOKING_PENDING':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      dotColor = 'bg-amber-500';
      break;
    case 'CANCELLED':
    case 'REJECTED':
    case 'FAILED':
    case 'EXPIRED':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
      break;
    default:
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {s.replace(/_/g, ' ')}
    </span>
  );
};
