import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeType?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeType = 'default',
  loading = false,
}) => {
  const badgeStyles = {
    default: 'bg-surface-soft text-muted border-brandBorder',
    success: 'bg-emerald-50 text-success border-success/20',
    warning: 'bg-amber-50 text-warning border-warning/20',
    danger: 'bg-red-50 text-danger border-danger/20',
    info: 'bg-sky-50 text-info border-info/20',
  };

  return (
    <div className="bg-surface rounded-card border border-brandBorder p-5 shadow-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-surface-soft text-navy flex items-center justify-center border border-brandBorder/50">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        {loading ? (
          <div className="h-8 w-20 bg-surface-soft animate-pulse rounded"></div>
        ) : (
          <div className="text-2xl font-bold text-navy tracking-tight">{value}</div>
        )}

        {badgeText && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyles[badgeType]}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-muted mt-2 truncate">{subtitle}</p>}
    </div>
  );
};
