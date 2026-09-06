import React from 'react';
import { POPULAR_AIRPORTS } from '../../utils/airports';
import type { Airport } from '../../utils/airports';
import { PlaneTakeoff, PlaneLanding } from 'lucide-react';

interface AirportSelectProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  type?: 'origin' | 'destination';
  placeholder?: string;
  disabled?: boolean;
}

export const AirportSelect: React.FC<AirportSelectProps> = ({
  label,
  value,
  onChange,
  type = 'origin',
  placeholder = 'Select airport',
  disabled = false,
}) => {
  const Icon = type === 'origin' ? PlaneTakeoff : PlaneLanding;

  return (
    <div className="flex flex-col">
      <label className="text-xs font-bold text-navy uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-white border border-brandBorder rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-9 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {POPULAR_AIRPORTS.map((airport: Airport) => (
            <option key={airport.code} value={airport.code}>
              {airport.code} — {airport.city} ({airport.country})
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brandText-muted">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
