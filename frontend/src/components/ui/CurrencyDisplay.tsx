import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface CurrencyDisplayProps {
  amount: number | string | undefined | null;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = 'USD',
  size = 'md',
  className = '',
}) => {
  const formatted = formatCurrency(amount, currency);

  let sizeClass = 'text-base font-bold';
  if (size === 'sm') sizeClass = 'text-sm font-semibold';
  if (size === 'lg') sizeClass = 'text-xl font-bold';
  if (size === 'xl') sizeClass = 'text-2xl sm:text-3xl font-extrabold';

  return (
    <span className={`text-navy tracking-tight ${sizeClass} ${className}`}>
      {formatted}
    </span>
  );
};
