import React from 'react';
import { UserRole } from '../../types';
import { ShieldCheck, UserCog, User } from 'lucide-react';

export const RoleBadge: React.FC<{ role?: UserRole | string; size?: 'sm' | 'md' }> = ({ role, size = 'md' }) => {
  const r = (role || 'PASSENGER').toUpperCase();

  const isSmall = size === 'sm';
  const sizeClasses = isSmall ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const iconSize = isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (r === 'SUPER_ADMIN') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
        <ShieldCheck className={iconSize} />
        Super Admin
      </span>
    );
  }

  if (r === 'OPS_AGENT') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
        <UserCog className={iconSize} />
        Ops Agent
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
      <User className={iconSize} />
      Passenger
    </span>
  );
};
