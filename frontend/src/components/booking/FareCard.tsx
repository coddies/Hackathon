import React from 'react';
import { FareType, Currency } from '../../types';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Check, X, Shield, ArrowRight } from 'lucide-react';

interface FareCardProps {
  fareType: FareType;
  price: number;
  currency?: Currency;
  isSelected?: boolean;
  onSelect: (fareType: FareType) => void;
  disabled?: boolean;
}

export const FareCard: React.FC<FareCardProps> = ({
  fareType,
  price,
  currency = Currency.USD,
  isSelected = false,
  onSelect,
  disabled = false,
}) => {
  const isBasic = fareType === FareType.BASIC;

  return (
    <div
      onClick={() => !disabled && onSelect(fareType)}
      className={`rounded-card border p-6 flex flex-col justify-between transition-all relative cursor-pointer ${
        isSelected
          ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-md'
          : 'bg-surface border-brandBorder hover:border-primary/40 hover:shadow-sm'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isSelected && (
        <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-primary text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-xs">
          Selected
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {isBasic ? 'Economy Value' : 'Standard Flexibility'}
          </span>
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded ${
              isBasic ? 'bg-surface-soft text-brandText' : 'bg-primary/10 text-primary'
            }`}
          >
            {isBasic ? 'Basic Fare' : 'Flexible Fare'}
          </span>
        </div>

        <div className="mb-6">
          <div className="text-2xl font-bold text-navy">
            <CurrencyDisplay amount={price} currency={currency} />
          </div>
          <span className="text-xs text-muted">Per passenger • Taxes included</span>
        </div>

        {/* Feature List */}
        <ul className="space-y-3 mb-6 text-xs text-brandText border-t border-brandBorder/60 pt-4">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <span>Standard cabin baggage included</span>
          </li>
          
          {isBasic ? (
            <>
              <li className="flex items-start gap-2 text-muted">
                <X className="w-4 h-4 text-danger/70 shrink-0 mt-0.5" />
                <span>No physical seat selection (assigned at check-in)</span>
              </li>
              <li className="flex items-start gap-2 text-muted">
                <X className="w-4 h-4 text-danger/70 shrink-0 mt-0.5" />
                <span>Strict cancellation (no cash refund)</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2 text-navy font-medium">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Choose your preferred physical seat</span>
              </li>
              <li className="flex items-start gap-2 text-navy font-medium">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Change-friendly & refund/travel credit options</span>
              </li>
              <li className="flex items-start gap-2 text-primary font-medium">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Priority boarding & flexible reschedule policy</span>
              </li>
            </>
          )}
        </ul>
      </div>

      <button
        type="button"
        disabled={disabled}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
          isSelected
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface-soft text-navy hover:bg-primary hover:text-white'
        }`}
      >
        <span>{isSelected ? 'Selected' : `Select ${isBasic ? 'Basic' : 'Flexible'}`}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
