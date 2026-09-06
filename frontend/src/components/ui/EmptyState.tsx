import React, { type ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  // Compat: actionLabel + onAction as an alternative to action
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  actionLabel,
  onAction,
}) => {
  const actionNode = action || (actionLabel && onAction ? (
    <button
      onClick={onAction}
      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors"
    >
      {actionLabel}
    </button>
  ) : null);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-brandBorder bg-white shadow-subtle my-4">
      <div className="w-14 h-14 rounded-2xl bg-surface-soft flex items-center justify-center text-muted mb-4 border border-brandBorder">
        <Icon className="w-7 h-7 text-navy" />
      </div>
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      {description && (
        <p className="text-sm text-brandText-muted mt-1 max-w-sm">{description}</p>
      )}
      {actionNode && <div className="mt-6">{actionNode}</div>}
    </div>
  );
};
