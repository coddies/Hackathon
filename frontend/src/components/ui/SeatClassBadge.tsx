import React from 'react';
import { SeatClass } from '../../types';
import { Crown, Briefcase, Users } from 'lucide-react';

export const SeatClassBadge: React.FC<{ seatClass: SeatClass | string; size?: 'sm' | 'md' }> = ({ seatClass, size = 'md' }) => {
  const sc = (seatClass || 'ECONOMY').toUpperCase();
  const isSmall = size === 'sm';
  const sizeClasses = isSmall ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const iconSize = isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (sc === 'FIRST') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
        <Crown className={`${iconSize} text-amber-600`} />
        First Class
      </span>
    );
  }

  if (sc === 'BUSINESS') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 ${sizeClasses}`}>
        <Briefcase className={`${iconSize} text-indigo-600`} />
        Business
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-sky-50 text-sky-800 border border-sky-200 ${sizeClasses}`}>
      <Users className={`${iconSize} text-sky-600`} />
      Economy
    </span>
  );
};
