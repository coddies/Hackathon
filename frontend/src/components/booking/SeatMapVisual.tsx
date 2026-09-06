import React from 'react';
import type { SeatMapResponse, SeatItem } from '../../types';
import { SeatStatus, SeatClass, FareType } from '../../types';
import { Armchair, Info, Check, Lock } from 'lucide-react';
import { SeatClassBadge } from '../ui/SeatClassBadge';

interface SeatMapVisualProps {
  seatMap?: SeatMapResponse | null;
  selectedSeatNumber?: string | null;
  onSelectSeat?: (seatNumber: string, seatClass: SeatClass) => void;
  fareType?: FareType;
  selectedClass?: SeatClass;
  isInteractive?: boolean;
}

export const SeatMapVisual: React.FC<SeatMapVisualProps> = ({
  seatMap,
  selectedSeatNumber,
  onSelectSeat,
  fareType = FareType.FLEXIBLE,
  selectedClass,
  isInteractive = true,
}) => {
  const isBasic = fareType === FareType.BASIC;

  if (!seatMap || !seatMap.seat_classes) {
    return (
      <div className="bg-surface p-8 rounded-card border border-brandBorder text-center">
        <Armchair className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
        <p className="text-sm text-muted">Seat map data is currently unavailable for this aircraft.</p>
      </div>
    );
  }

  // Group seats by class and rows
  const renderClassSection = (className: SeatClass, title: string, seats: SeatItem[]) => {
    if (!seats || seats.length === 0) return null;

    const isCurrentClass = !selectedClass || selectedClass === className;

    return (
      <div className={`p-5 rounded-card border transition-all ${
        isCurrentClass ? 'bg-surface border-brandBorder shadow-xs' : 'bg-surface-soft/60 border-brandBorder/60 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-brandBorder/60">
          <div className="flex items-center gap-2">
            <SeatClassBadge seatClass={className} />
            <span className="text-xs font-semibold text-navy uppercase tracking-wider">{title} Cabin</span>
          </div>
          <span className="text-xs text-muted">
            {seats.filter(s => s.is_available ?? (s.status === SeatStatus.AVAILABLE)).length} / {seats.length} available
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 justify-items-center">
          {seats.map((seat: any) => {
            const isSelected = selectedSeatNumber === seat.seat_number;
            const isAvailable = seat.is_available ?? (seat.status === SeatStatus.AVAILABLE);
            const isHeld = seat.status === SeatStatus.HELD;
            const isBooked = !isAvailable && !isHeld;

            let seatColor = 'bg-surface border-brandBorder text-navy hover:border-primary hover:bg-primary/5 cursor-pointer';
            if (isBooked) {
              seatColor = 'bg-surface-soft border-brandBorder/50 text-muted/40 cursor-not-allowed';
            } else if (isHeld) {
              seatColor = 'bg-amber-50 border-warning text-warning cursor-not-allowed';
            } else if (isSelected) {
              seatColor = 'bg-primary border-primary text-white shadow-sm font-bold scale-105';
            }

            const canClick = isInteractive && !isBasic && isAvailable && isCurrentClass;

            return (
              <button
                key={seat.seat_number}
                type="button"
                disabled={!canClick}
                onClick={() => {
                  if (canClick && onSelectSeat) {
                    onSelectSeat(seat.seat_number, className);
                  }
                }}
                className={`w-11 h-11 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all relative ${seatColor} ${
                  !canClick && !isSelected && 'cursor-not-allowed'
                }`}
                title={`Seat ${seat.seat_number} (${seat.status})`}
              >
                <span className="text-[11px]">{seat.seat_number}</span>
                {isSelected ? (
                  <Check className="w-3 h-3 text-white" />
                ) : isBooked ? (
                  <span className="text-[9px] text-muted/60">OCC</span>
                ) : isHeld ? (
                  <Lock className="w-2.5 h-2.5 text-warning" />
                ) : (
                  <span className="text-[9px] text-muted">FREE</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Fare Warning */}
      {isBasic && isInteractive && (
        <div className="p-4 rounded-card bg-amber-50 border border-warning/30 flex items-start gap-3 text-warning">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-navy">Basic fare does not include physical seat selection.</p>
            <p className="text-muted mt-0.5">A seat will be automatically assigned at check-in. Upgrade to Flexible fare to choose your seat.</p>
          </div>
        </div>
      )}

      {/* Seat Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 p-3 bg-surface rounded-card border border-brandBorder text-xs text-brandText">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-surface border border-brandBorder"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary text-white flex items-center justify-center text-[9px]">✓</div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-50 border border-warning"></div>
          <span>Held / Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-surface-soft border border-brandBorder/50"></div>
          <span>Booked / Occupied</span>
        </div>
      </div>

      {/* Cabins */}
      <div className="space-y-4">
        {seatMap.seat_classes.FIRST && renderClassSection(SeatClass.FIRST, 'First Class', seatMap.seat_classes.FIRST)}
        {seatMap.seat_classes.BUSINESS && renderClassSection(SeatClass.BUSINESS, 'Business Class', seatMap.seat_classes.BUSINESS)}
        {seatMap.seat_classes.ECONOMY && renderClassSection(SeatClass.ECONOMY, 'Economy Class', seatMap.seat_classes.ECONOMY)}
      </div>
    </div>
  );
};
