import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getFlightByIdApi, getSeatMapApi } from '../../api/flights';
import { bookingsApi } from '../../api/bookings';
import type {
  FlightDetailResponse,
  SeatMapResponse,
  SeatHoldResponse,
  PassengerInput,
} from '../../types';
import { SeatClass, FareType, CancellationPolicy } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SeatMapVisual } from '../../components/booking/SeatMapVisual';
import { HoldTimer } from '../../components/booking/HoldTimer';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, formatDate, formatTime } from '../../utils/formatters';
import {
  Plane,
  Check,
  Armchair,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

// Compat aliases
const createSeatHoldApi = (payload: Parameters<typeof bookingsApi.createHold>[0], key?: string) => bookingsApi.createHold(payload, key);
const confirmBookingApi = (payload: Parameters<typeof bookingsApi.confirmBooking>[0], key?: string) => bookingsApi.confirmBooking(payload, key);

export const CheckoutPage: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  // URL parameters or defaults
  const initialClass = (searchParams.get('class') as SeatClass) || SeatClass.ECONOMY;
  const initialFare = (searchParams.get('fare') as FareType) || FareType.FLEXIBLE;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [flight, setFlight] = useState<FlightDetailResponse | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Passenger Details
  const [passengerName, setPassengerName] = useState(user?.full_name || '');
  const [passengerEmail, setPassengerEmail] = useState(user?.email || '');
  const [passportNumber, setPassportNumber] = useState('');

  // Step 2: Seat & Hold
  const [selectedSeatClass, setSelectedSeatClass] = useState<SeatClass>(initialClass);
  const [selectedFareType] = useState<FareType>(initialFare);
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<string | null>(null);
  const [activeHold, setActiveHold] = useState<SeatHoldResponse | null>(null);
  const [isHolding, setIsHolding] = useState(false);

  // Step 3: Confirmation submission
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const loadFlightData = async () => {
      if (!flightId) return;
      try {
        setLoading(true);
        setError(null);
        const [flightData, mapData] = await Promise.all([
          getFlightByIdApi(flightId),
          getSeatMapApi(flightId).catch(() => null),
        ]);
        setFlight(flightData);
        setSeatMap(mapData);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load checkout details.');
      } finally {
        setLoading(false);
      }
    };
    loadFlightData();
  }, [flightId]);

  if (loading) return <LoadingState message="Initializing booking session and seat matrix..." />;
  if (error || !flight) return <ErrorState message={error || 'Flight not found'} onRetry={() => window.location.reload()} />;

  const inv = flight.inventories?.find((i) => i.seat_class === selectedSeatClass);
  const price = selectedFareType === FareType.BASIC ? inv?.basic_fare_price ?? 0 : inv?.flexible_fare_price ?? 0;

  // Step 1 -> Step 2 validation
  const handleProceedToSeat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim() || !passengerEmail.trim()) {
      showToast('error', 'Please provide passenger full name and contact email.');
      return;
    }
    setCurrentStep(2);
  };

  // Step 2: Create seat hold
  const handleCreateHold = async () => {
    if (selectedFareType === FareType.FLEXIBLE && !selectedSeatNumber) {
      showToast('warning', 'Please select an available seat from the seat map to proceed.');
      return;
    }

    try {
      setIsHolding(true);
      const hold = await createSeatHoldApi({
        flight_id: flight.id,
        seat_class: selectedSeatClass,
        passenger_count: 1,
        fare_type: selectedFareType,
        seat_number: selectedFareType === FareType.FLEXIBLE ? selectedSeatNumber || undefined : undefined,
      });

      setActiveHold(hold);
      showToast('success', 'Seat hold confirmed! Reserved for 15 minutes.');
      setCurrentStep(3);
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to secure seat hold.');
    } finally {
      setIsHolding(false);
    }
  };

  // Step 3: Final confirmation
  const handleFinalBookingConfirm = async () => {
    if (!activeHold) {
      showToast('error', 'No active seat hold found. Please return to Step 2.');
      return;
    }

    try {
      setIsConfirming(true);
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const passengersList: PassengerInput[] = [
        {
          name: passengerName.trim(),
          email: passengerEmail.trim(),
          passport_number: passportNumber.trim() || undefined,
          seat_number: selectedFareType === FareType.FLEXIBLE ? selectedSeatNumber || undefined : undefined,
        },
      ];

      const booking = await confirmBookingApi(
        {
          hold_id: activeHold.id,
          passengers: passengersList,
          cancellation_policy:
            selectedFareType === FareType.BASIC
              ? CancellationPolicy.NON_REFUNDABLE
              : CancellationPolicy.REFUNDABLE,
          currency: flight.currency,
        },
        idempotencyKey
      );

      showToast('success', 'Flight booking confirmed successfully!');
      navigate(`/booking/${booking.booking_reference}`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Booking confirmation failed. Please retry.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* 3-Step Header Stepper */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-brandBorder -translate-y-1/2 z-0"></div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-surface px-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= 1
                  ? 'bg-primary text-white ring-4 ring-primary/10'
                  : 'bg-surface-soft border border-brandBorder text-muted'
              }`}
            >
              1
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep >= 1 ? 'text-navy' : 'text-muted'
              }`}
            >
              Passenger Details
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-surface px-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep >= 2
                  ? 'bg-primary text-white ring-4 ring-primary/10'
                  : 'bg-surface-soft border border-brandBorder text-muted'
              }`}
            >
              2
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep >= 2 ? 'text-navy' : 'text-muted'
              }`}
            >
              Seat & Fare
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-surface px-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3
                  ? 'bg-primary text-white ring-4 ring-primary/10'
                  : 'bg-surface-soft border border-brandBorder text-muted'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 3 ? 'text-navy' : 'text-muted'
              }`}
            >
              Confirm Booking
            </span>
          </div>
        </div>
      </div>

      {/* Flight Quick Summary Banner */}
      <div className="p-4 bg-surface-soft rounded-card border border-brandBorder/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <Plane className="w-4 h-4 text-primary" />
          <span className="font-bold text-navy">Flight {flight.flight_number}:</span>
          <span>{flight.origin} → {flight.destination}</span>
          <span className="text-muted">({formatDate(flight.departure_time)} at {formatTime(flight.departure_time)})</span>
        </div>
        <div className="flex items-center gap-2">
          <SeatClassBadge seatClass={selectedSeatClass} />
          <span className="font-bold text-navy">${price}</span>
        </div>
      </div>

      {/* STEP 1: PASSENGER DETAILS */}
      {currentStep === 1 && (
        <form onSubmit={handleProceedToSeat} className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-navy">Primary Passenger Information</h2>
            <p className="text-xs text-muted">Please enter traveler name matching government identification.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Full Legal Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Johnathan Smith"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Contact Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. passenger@example.com"
                value={passengerEmail}
                onChange={(e) => setPassengerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Passport / ID Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. A12345678"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Passenger Count
              </label>
              <input
                type="text"
                disabled
                value="1 Adult Passenger"
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface-soft text-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-brandBorder">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm"
            >
              <span>Continue to Seat Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: SEAT & FARE SELECTION */}
      {currentStep === 2 && (
        <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brandBorder/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-navy">Choose Your Seat & Reserve Hold</h2>
              <p className="text-xs text-muted">
                {selectedFareType === FareType.BASIC
                  ? 'Basic Fare: Physical seat selection is disabled. Seat will be auto-assigned.'
                  : 'Flexible Fare: Click any available seat on the interactive aircraft map.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Fare Type:</span>
              <span className="text-xs font-bold text-navy px-2.5 py-1 bg-surface-soft rounded-lg border border-brandBorder">
                {selectedFareType}
              </span>
            </div>
          </div>

          {/* Seat Map Visual */}
          <SeatMapVisual
            seatMap={seatMap}
            selectedSeatNumber={selectedSeatNumber}
            onSelectSeat={(seatNum, seatClass) => {
              setSelectedSeatNumber(seatNum);
              setSelectedSeatClass(seatClass);
            }}
            fareType={selectedFareType}
            selectedClass={selectedSeatClass}
            isInteractive={true}
          />

          {selectedFareType === FareType.FLEXIBLE && selectedSeatNumber && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-card flex items-center justify-between text-primary">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Armchair className="w-4 h-4" />
                <span>Selected Physical Seat: <strong className="text-sm font-bold text-navy">{selectedSeatNumber}</strong> ({selectedSeatClass} Cabin)</span>
              </div>
              <span className="text-xs font-bold">Included Free</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-brandBorder">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 text-xs font-semibold text-brandText hover:bg-surface-soft rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Passenger Details</span>
            </button>

            <button
              type="button"
              disabled={isHolding || (selectedFareType === FareType.FLEXIBLE && !selectedSeatNumber)}
              onClick={handleCreateHold}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{isHolding ? 'Securing Hold...' : 'Create Hold & Proceed'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIRM BOOKING */}
      {currentStep === 3 && (
        <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-base font-bold text-navy">Review & Confirm Your Reservation</h2>
            <p className="text-xs text-muted">Verify flight details before locking in the final booking.</p>
          </div>

          {/* Seat Hold Countdown Timer */}
          {activeHold?.hold_expires_at && (
            <HoldTimer
              expiresAt={activeHold.hold_expires_at}
              onExpired={() => {
                showToast('error', 'Seat hold has expired. Please re-select your seat.');
                setCurrentStep(2);
              }}
            />
          )}

          {/* Review Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Flight & Seat Specs */}
            <div className="p-5 bg-surface-soft rounded-card border border-brandBorder/60 space-y-3 text-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-muted border-b border-brandBorder/60 pb-2">
                Flight Details
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Flight Number:</span>
                <span className="font-bold text-navy">{flight.flight_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Route:</span>
                <span className="font-semibold text-navy">{flight.origin} → {flight.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Departure:</span>
                <span className="font-semibold text-navy">{formatDateTime(flight.departure_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cabin Class:</span>
                <SeatClassBadge seatClass={selectedSeatClass} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Assigned Seat:</span>
                <span className="font-bold text-navy">
                  {selectedFareType === FareType.FLEXIBLE ? selectedSeatNumber || 'Pending' : 'Assigned at Check-in'}
                </span>
              </div>
            </div>

            {/* Right: Passenger & Price Specs */}
            <div className="p-5 bg-surface-soft rounded-card border border-brandBorder/60 space-y-3 text-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-muted border-b border-brandBorder/60 pb-2">
                Passenger & Payment
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Passenger Name:</span>
                <span className="font-semibold text-navy">{passengerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Email Address:</span>
                <span className="font-semibold text-navy">{passengerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fare Category:</span>
                <span className="font-semibold text-navy">{selectedFareType} Fare</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cancellation Rule:</span>
                <span className="font-semibold text-navy">
                  {selectedFareType === FareType.BASIC ? 'Non-Refundable' : 'Flexible Travel Credit'}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-brandBorder/60">
                <span className="text-xs font-bold text-navy uppercase">Total Due:</span>
                <span className="text-lg font-bold text-primary">
                  <CurrencyDisplay amount={price} currency={flight.currency} />
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation Notice */}
          <div className="p-4 bg-emerald-50 rounded-card border border-success/30 flex items-center gap-3 text-success">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="text-xs font-medium">
              By confirming, your seat will be permanently ticketed and an instant booking confirmation reference generated.
            </span>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-brandBorder">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={isConfirming}
              className="px-4 py-2.5 text-xs font-semibold text-brandText hover:bg-surface-soft rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Adjust Seat Selection</span>
            </button>

            <button
              type="button"
              disabled={isConfirming}
              onClick={handleFinalBookingConfirm}
              className="px-8 py-3 bg-success hover:bg-success/90 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{isConfirming ? 'Securing Booking...' : 'Confirm Flight Booking'}</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
