import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFlightByIdApi, getSeatMapApi } from '../../api/flights';
import { joinWaitlistApi } from '../../api/waitlist';
import type { FlightDetailResponse, SeatMapResponse } from '../../types';
import { SeatClass, FareType, LoyaltyTier } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FlightStatusBadge } from '../../components/ui/FlightStatusBadge';
import { SeatClassBadge } from '../../components/ui/SeatClassBadge';
import { FareCard } from '../../components/booking/FareCard';
import { SeatMapVisual } from '../../components/booking/SeatMapVisual';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  formatDuration,
  formatDate,
  formatTime,
} from '../../utils/formatters';
import { getAirportCity } from '../../utils/airports';
import {
  Plane,
  ArrowRight,
  UserPlus,
  Info,
  X,
} from 'lucide-react';

export const FlightDetailPage: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [flight, setFlight] = useState<FlightDetailResponse | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState<SeatClass>(SeatClass.ECONOMY);
  const [selectedFare, setSelectedFare] = useState<FareType>(FareType.FLEXIBLE);

  // Waitlist modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistName, setWaitlistName] = useState(user?.full_name || '');
  const [waitlistEmail, setWaitlistEmail] = useState(user?.email || '');
  const [waitlistLoyalty, setWaitlistLoyalty] = useState<LoyaltyTier>(LoyaltyTier.STANDARD);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  const fetchDetails = async () => {
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

      // Default to first available class if economy is empty
      if (flightData.inventories) {
        const econ = flightData.inventories.find(i => i.seat_class === SeatClass.ECONOMY);
        const biz = flightData.inventories.find(i => i.seat_class === SeatClass.BUSINESS);
        const first = flightData.inventories.find(i => i.seat_class === SeatClass.FIRST);

        if (econ && econ.available_seats > 0) {
          setSelectedClass(SeatClass.ECONOMY);
        } else if (biz && biz.available_seats > 0) {
          setSelectedClass(SeatClass.BUSINESS);
        } else if (first && first.available_seats > 0) {
          setSelectedClass(SeatClass.FIRST);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load flight specifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [flightId]);

  if (loading) return <LoadingState message="Fetching flight details and real-time cabin availability..." />;
  if (error || !flight) return <ErrorState message={error || 'Flight not found'} onRetry={fetchDetails} />;

  // Find inventory for currently selected class
  const currentInventory = flight.inventories?.find(i => i.seat_class === selectedClass);
  const availableSeats = currentInventory?.available_seats ?? 0;
  const isClassFull = availableSeats <= 0;

  const basicPrice = currentInventory?.basic_fare_price ?? 0;
  const flexiblePrice = currentInventory?.flexible_fare_price ?? 0;

  const handleContinueToCheckout = () => {
    navigate(`/checkout/${flight.id}?class=${selectedClass}&fare=${selectedFare}`);
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistName || !waitlistEmail) return;

    try {
      setJoiningWaitlist(true);
      const res = await joinWaitlistApi({
        flight_id: flight.id,
        seat_class: selectedClass,
        passenger_name: waitlistName,
        email: waitlistEmail,
        loyalty_tier: waitlistLoyalty,
        fare_type: selectedFare,
      });

      showToast('success', `Joined waitlist successfully! Priority position: #${res.priority_score || 1}`);
      setShowWaitlistModal(false);
      navigate(`/waitlist/${res.id}`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to join waitlist.');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Route Header Card */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brandBorder/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-navy tracking-tight">Flight {flight.flight_number}</span>
                <FlightStatusBadge status={flight.status} />
              </div>
              <p className="text-xs text-muted">
                Aircraft Capacity: {flight.capacity} seats • Currency: {flight.currency}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Departure Date</span>
            <div className="text-sm font-bold text-navy">{formatDate(flight.departure_time)}</div>
          </div>
        </div>

        {/* Flight Route & Timings */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center pt-6">
          {/* Departure */}
          <div className="md:col-span-4 space-y-1">
            <div className="text-3xl font-extrabold text-navy">{flight.origin}</div>
            <div className="text-xs font-semibold text-brandText">{getAirportCity(flight.origin)}</div>
            <div className="text-sm font-bold text-primary">{formatTime(flight.departure_time)}</div>
            <div className="text-[11px] text-muted">{formatDate(flight.departure_time)}</div>
          </div>

          {/* Duration info */}
          <div className="md:col-span-3 text-center space-y-1.5 py-2">
            <div className="text-xs font-semibold text-muted">
              {formatDuration(flight.departure_time, flight.arrival_time)}
            </div>
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-brandBorder"></div>
              <div className="absolute px-2 bg-surface text-primary">
                <Plane className="w-4 h-4 transform rotate-90" />
              </div>
            </div>
            <div className="text-[11px] font-medium text-success">Non-stop Scheduled</div>
          </div>

          {/* Arrival */}
          <div className="md:col-span-4 text-left md:text-right space-y-1">
            <div className="text-3xl font-extrabold text-navy">{flight.destination}</div>
            <div className="text-xs font-semibold text-brandText">{getAirportCity(flight.destination)}</div>
            <div className="text-sm font-bold text-primary">{formatTime(flight.arrival_time)}</div>
            <div className="text-[11px] text-muted">{formatDate(flight.arrival_time)}</div>
          </div>
        </div>
      </div>

      {/* Seat Class Selection Tabs */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
          Select Cabin Class & View Fare Rules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: SeatClass.ECONOMY, label: 'Economy Class' },
            { key: SeatClass.BUSINESS, label: 'Business Class' },
            { key: SeatClass.FIRST, label: 'First Class' },
          ].map((cabin) => {
            const inv = flight.inventories?.find(i => i.seat_class === cabin.key);
            const isAvail = inv && inv.available_seats > 0;
            const isSelected = selectedClass === cabin.key;

            return (
              <button
                key={cabin.key}
                type="button"
                onClick={() => setSelectedClass(cabin.key)}
                className={`p-4 rounded-card border text-left transition-all ${
                  isSelected
                    ? 'bg-surface border-primary ring-2 ring-primary/20 shadow-sm'
                    : 'bg-surface-soft/60 border-brandBorder hover:bg-surface'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <SeatClassBadge seatClass={cabin.key} />
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      isAvail ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {isAvail ? `${inv?.available_seats} seats left` : 'Full / Waitlist'}
                  </span>
                </div>
                <div className="font-bold text-navy text-sm">{cabin.label}</div>
                <div className="text-xs text-muted mt-1">
                  {inv ? `From $${inv.basic_fare_price}` : 'Unallocated'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability or Full Class Waitlist Section */}
      {isClassFull ? (
        <div className="p-6 bg-amber-50 rounded-card border border-warning/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 text-warning font-bold text-base">
              <Info className="w-5 h-5" />
              <span>{selectedClass} Cabin is Currently Sold Out</span>
            </div>
            <p className="text-xs text-muted">
              You can join the automated waitlist queue. If seats open up from cancellations or holds, you will be given priority to claim your seat.
            </p>
          </div>
          <button
            onClick={() => setShowWaitlistModal(true)}
            className="px-5 py-2.5 bg-warning hover:bg-warning/90 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shrink-0 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Join Waitlist Queue</span>
          </button>
        </div>
      ) : (
        /* Fare Comparison Cards */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Choose Fare Option for {selectedClass} Cabin
            </h3>
            {currentInventory?.booking_cutoff_hours && (
              <span className="text-xs text-muted font-medium">
                Booking cutoff: {currentInventory.booking_cutoff_hours} hours prior to departure
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FareCard
              fareType={FareType.BASIC}
              price={basicPrice}
              currency={flight.currency}
              isSelected={selectedFare === FareType.BASIC}
              onSelect={(fare) => setSelectedFare(fare)}
            />
            <FareCard
              fareType={FareType.FLEXIBLE}
              price={flexiblePrice}
              currency={flight.currency}
              isSelected={selectedFare === FareType.FLEXIBLE}
              onSelect={(fare) => setSelectedFare(fare)}
            />
          </div>

          {/* Action Bar */}
          <div className="p-5 bg-surface rounded-card border border-brandBorder flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div>
              <div className="text-xs text-muted">Selected Configuration:</div>
              <div className="text-sm font-bold text-navy">
                {selectedClass} Cabin • {selectedFare === FareType.BASIC ? 'Basic Value Fare' : 'Flexible Fare with Seat Selection'}
              </div>
            </div>

            <button
              onClick={handleContinueToCheckout}
              className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Continue to Passenger Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Aircraft Cabin Visual Map (Preview) */}
      {seatMap && (
        <div className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
              Aircraft Seat Map Preview
            </h3>
            <span className="text-xs text-muted">Real-time cabin layout</span>
          </div>

          <SeatMapVisual
            seatMap={seatMap}
            selectedClass={selectedClass}
            fareType={selectedFare}
            isInteractive={false}
          />
        </div>
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-card border border-brandBorder shadow-xl max-w-md w-full overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-brandBorder flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-navy">Join Waitlist Queue</h3>
              </div>
              <button onClick={() => setShowWaitlistModal(false)} className="text-muted hover:text-navy">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinWaitlist} className="p-6 space-y-4">
              <div className="p-3 bg-surface-soft rounded-lg text-xs space-y-1 border border-brandBorder/60">
                <div className="font-semibold text-navy">Flight {flight.flight_number} — {selectedClass} Class</div>
                <div className="text-muted">{flight.origin} → {flight.destination} ({formatDate(flight.departure_time)})</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy"
                  placeholder="e.g., Jane Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy"
                  placeholder="e.g., passenger@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">Loyalty Tier (if applicable)</label>
                <select
                  value={waitlistLoyalty}
                  onChange={(e) => setWaitlistLoyalty(e.target.value as LoyaltyTier)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy"
                >
                  <option value={LoyaltyTier.STANDARD}>Standard (Standard Priority)</option>
                  <option value={LoyaltyTier.SILVER}>Silver Tier (+5 Priority)</option>
                  <option value={LoyaltyTier.GOLD}>Gold Tier (+10 Priority)</option>
                  <option value={LoyaltyTier.PLATINUM}>Platinum Tier (+15 Priority)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brandBorder">
                <button
                  type="button"
                  onClick={() => setShowWaitlistModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-brandText hover:bg-surface-soft rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joiningWaitlist}
                  className="px-5 py-2 text-xs font-semibold bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors shadow-xs"
                >
                  {joiningWaitlist ? 'Registering...' : 'Confirm Waitlist Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
