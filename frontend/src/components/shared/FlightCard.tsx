import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { FlightSearchResponse } from '../../types';
import { getAirportByCode } from '../../utils/airports';
import { formatTime, formatDate, calculateDuration } from '../../utils/formatters';
import { FlightStatusBadge } from '../ui/FlightStatusBadge';
import { SeatClassBadge } from '../ui/SeatClassBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Plane, ShieldCheck, ChevronRight } from 'lucide-react';

interface FlightCardProps {
  flight: FlightSearchResponse;
  selectedPassengers?: number;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, selectedPassengers: _selectedPassengers = 1 }) => {
  const navigate = useNavigate();
  const originAirport = getAirportByCode(flight.origin);
  const destAirport = getAirportByCode(flight.destination);
  const duration = calculateDuration(flight.departure_at, flight.arrival_at);

  // Find lowest basic fare and flexible fare across available classes
  const classes = flight.available_classes || [];
  const lowestBasic = classes.length > 0 ? Math.min(...classes.map(c => typeof c.fare_basic === 'string' ? parseFloat(c.fare_basic) : c.fare_basic)) : null;

  return (
    <div className="bg-white rounded-2xl border border-brandBorder shadow-subtle hover:shadow-card transition-all p-6 mb-4">
      {/* Top Bar: Flight Number & Status */}
      <div className="flex items-center justify-between border-b border-brandBorder/60 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center font-bold text-xs border border-primary-100">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold text-navy tracking-tight">{flight.flight_number}</span>
            <span className="text-xs text-brandText-muted ml-2 font-medium">Non-stop</span>
          </div>
        </div>
        <FlightStatusBadge status={flight.status} />
      </div>

      {/* Flight Schedule Details & Visual Route */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Origin */}
        <div className="md:col-span-3 text-left">
          <div className="text-2xl font-extrabold text-navy">{formatTime(flight.departure_at)}</div>
          <div className="text-sm font-bold text-navy">{flight.origin}</div>
          <div className="text-xs text-brandText-muted truncate">{originAirport.city}</div>
          <div className="text-xs text-brandText-muted mt-0.5">{formatDate(flight.departure_at)}</div>
        </div>

        {/* Flight Route Indicator */}
        <div className="md:col-span-3 flex flex-col items-center justify-center px-2">
          <span className="text-xs font-semibold text-brandText-muted mb-1">{duration}</span>
          <div className="w-full flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <div className="flex-1 h-[2px] bg-brandBorder relative">
              <Plane className="w-3.5 h-3.5 text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-navy" />
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1">Direct Flight</span>
        </div>

        {/* Destination */}
        <div className="md:col-span-3 text-left md:text-right">
          <div className="text-2xl font-extrabold text-navy">{formatTime(flight.arrival_at)}</div>
          <div className="text-sm font-bold text-navy">{flight.destination}</div>
          <div className="text-xs text-brandText-muted truncate">{destAirport.city}</div>
          <div className="text-xs text-brandText-muted mt-0.5">{formatDate(flight.arrival_at)}</div>
        </div>

        {/* Pricing & CTA */}
        <div className="md:col-span-3 flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-brandBorder/60 pt-4 md:pt-0 md:pl-6">
          <div className="text-left md:text-right">
            <span className="text-xs text-brandText-muted font-medium block">Starting from</span>
            {lowestBasic !== null ? (
              <CurrencyDisplay amount={lowestBasic} currency={flight.currency || 'USD'} size="lg" />
            ) : (
              <span className="text-sm font-semibold text-rose-600">Sold Out</span>
            )}
            <span className="text-[11px] text-brandText-muted block mt-0.5">per passenger</span>
          </div>

          <button
            onClick={() => navigate(`/flight/${flight.id}`)}
            disabled={flight.status === 'CANCELLED'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Select Flight
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Class Availabilities pill list */}
      <div className="mt-5 pt-3 border-t border-brandBorder/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {classes.map((cls) => {
            const hasSeats = cls.available_seats > 0;
            return (
              <div
                key={cls.id}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${
                  hasSeats ? 'bg-surface-soft border-brandBorder text-navy' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <SeatClassBadge seatClass={cls.seat_class} size="sm" />
                <span className="font-semibold">
                  {hasSeats ? (
                    <span className="text-emerald-700">{cls.available_seats} seats left</span>
                  ) : (
                    <span className="text-rose-600">Waitlist Only</span>
                  )}
                </span>
                <span className="text-brandText-muted">|</span>
                <span className="font-medium">from ${cls.fare_basic}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Flexible & Basic Fares Available</span>
        </div>
      </div>
    </div>
  );
};
