import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFlightApi } from '../../api/admin';
import { SeatClass, Currency } from '../../types';
import { AirportSelect } from '../../components/ui/AirportSelect';
import { useToast } from '../../context/ToastContext';
import { PlaneTakeoff, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

export const AdminCreateFlightPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Left Column States (Flight Overview)
  const [flightNumber, setFlightNumber] = useState('SK-');
  const [origin, setOrigin] = useState('LHE');
  const [destination, setDestination] = useState('DXB');
  
  // Default departure tomorrow 10:00, arrival 13:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const depIso = new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString().slice(0, 16);
  const arrIso = new Date(tomorrow.setHours(14, 0, 0, 0)).toISOString().slice(0, 16);

  const [departureTime, setDepartureTime] = useState(depIso);
  const [arrivalTime, setArrivalTime] = useState(arrIso);
  const [capacity, setCapacity] = useState(150);
  const [currency, setCurrency] = useState<Currency>(Currency.USD);

  // Right Column States (Seat Allocations)
  const [firstSeats, setFirstSeats] = useState(10);
  const [firstBasicFare, setFirstBasicFare] = useState(450);
  const [firstFlexFare, setFirstFlexFare] = useState(600);
  const [firstCutoff, setFirstCutoff] = useState(2);

  const [bizSeats, setBizSeats] = useState(30);
  const [bizBasicFare, setBizBasicFare] = useState(250);
  const [bizFlexFare, setBizFlexFare] = useState(350);
  const [bizCutoff, setBizCutoff] = useState(2);

  const [econSeats, setEconSeats] = useState(110);
  const [econBasicFare, setEconBasicFare] = useState(100);
  const [econFlexFare, setEconFlexFare] = useState(140);
  const [econCutoff, setEconCutoff] = useState(1);

  const [submitting, setSubmitting] = useState(false);

  // Live Capacity Balance Calculation
  const totalAllocated = Number(firstSeats) + Number(bizSeats) + Number(econSeats);
  const isBalanced = totalAllocated === Number(capacity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBalanced) {
      showToast('error', `Seat capacity imbalance! Declared aircraft capacity is ${capacity}, but allocated seats equal ${totalAllocated}.`);
      return;
    }

    if (new Date(departureTime) >= new Date(arrivalTime)) {
      showToast('error', 'Arrival time must be strictly after departure time.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        flight_number: flightNumber.trim().toUpperCase(),
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        departure_at: new Date(departureTime).toISOString(),
        arrival_at: new Date(arrivalTime).toISOString(),
        departure_time: new Date(departureTime).toISOString(),
        arrival_time: new Date(arrivalTime).toISOString(),
        aircraft_capacity: Number(capacity),
        currency,
        seat_classes: [
          {
            seat_class: SeatClass.FIRST,
            total_seats: Number(firstSeats),
            basic_fare_price: Number(firstBasicFare),
            flexible_fare_price: Number(firstFlexFare),
            booking_cutoff_hours: Number(firstCutoff),
          },
          {
            seat_class: SeatClass.BUSINESS,
            total_seats: Number(bizSeats),
            basic_fare_price: Number(bizBasicFare),
            flexible_fare_price: Number(bizFlexFare),
            booking_cutoff_hours: Number(bizCutoff),
          },
          {
            seat_class: SeatClass.ECONOMY,
            total_seats: Number(econSeats),
            basic_fare_price: Number(econBasicFare),
            flexible_fare_price: Number(econFlexFare),
            booking_cutoff_hours: Number(econCutoff),
          },
        ],
      };

      const res = await createFlightApi(payload);
      showToast('success', `Flight ${res.flight_number} created and dispatched successfully!`);
      navigate(`/admin/flights/${res.id}`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Failed to create flight.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/flights')}
            className="p-2 rounded-lg border border-brandBorder bg-surface hover:bg-surface-soft text-muted hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy tracking-tight">Create Scheduled Flight</h1>
            <p className="text-xs text-muted">Initialize aircraft specifications, flight routes, and cabin pricing matrices</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Flight Overview & Times) */}
          <div className="lg:col-span-6 bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider border-b border-brandBorder/60 pb-3 flex items-center gap-2">
              <PlaneTakeoff className="w-4 h-4 text-primary" />
              <span>Flight & Route Specifications</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">
                Flight Number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., SK-302"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AirportSelect
                label="Origin (Departure Airport)"
                value={origin}
                onChange={setOrigin}
              />
              <AirportSelect
                label="Destination (Arrival Airport)"
                value={destination}
                onChange={setDestination}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Departure Datetime <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Arrival Datetime <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Declared Aircraft Capacity <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Billing Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value={Currency.USD}>USD ($)</option>
                  <option value={Currency.EUR}>EUR (€)</option>
                  <option value={Currency.GBP}>GBP (£)</option>
                  <option value={Currency.PKR}>PKR (Rs)</option>
                  <option value={Currency.AED}>AED (د.إ)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column (Cabin Class Seat Allocations) */}
          <div className="lg:col-span-6 bg-surface rounded-card border border-brandBorder shadow-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wider border-b border-brandBorder/60 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Cabin Inventory & Pricing Matrix</span>
            </h2>

            {/* First Class */}
            <div className="p-3.5 bg-surface-soft rounded-lg border border-brandBorder/60 space-y-2.5">
              <span className="text-xs font-bold text-navy uppercase tracking-wide">First Class Cabin</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Seats</label>
                  <input
                    type="number"
                    min="0"
                    value={firstSeats}
                    onChange={(e) => setFirstSeats(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Basic ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={firstBasicFare}
                    onChange={(e) => setFirstBasicFare(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Flex ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={firstFlexFare}
                    onChange={(e) => setFirstFlexFare(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Cutoff (h)</label>
                  <input
                    type="number"
                    min="0"
                    value={firstCutoff}
                    onChange={(e) => setFirstCutoff(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
              </div>
            </div>

            {/* Business Class */}
            <div className="p-3.5 bg-surface-soft rounded-lg border border-brandBorder/60 space-y-2.5">
              <span className="text-xs font-bold text-navy uppercase tracking-wide">Business Class Cabin</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Seats</label>
                  <input
                    type="number"
                    min="0"
                    value={bizSeats}
                    onChange={(e) => setBizSeats(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Basic ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={bizBasicFare}
                    onChange={(e) => setBizBasicFare(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Flex ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={bizFlexFare}
                    onChange={(e) => setBizFlexFare(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Cutoff (h)</label>
                  <input
                    type="number"
                    min="0"
                    value={bizCutoff}
                    onChange={(e) => setBizCutoff(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
              </div>
            </div>

            {/* Economy Class */}
            <div className="p-3.5 bg-surface-soft rounded-lg border border-brandBorder/60 space-y-2.5">
              <span className="text-xs font-bold text-navy uppercase tracking-wide">Economy Class Cabin</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Seats</label>
                  <input
                    type="number"
                    min="0"
                    value={econSeats}
                    onChange={(e) => setEconSeats(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Basic ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={econBasicFare}
                    onChange={(e) => setEconBasicFare(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Flex ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={econFlexFare}
                    onChange={(e) => setEconFlexFare(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Cutoff (h)</label>
                  <input
                    type="number"
                    min="0"
                    value={econCutoff}
                    onChange={(e) => setEconCutoff(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs rounded border border-brandBorder bg-surface text-navy"
                  />
                </div>
              </div>
            </div>

            {/* Live Capacity Reconciliation Panel */}
            <div className={`p-4 rounded-card border text-xs flex items-center justify-between ${
              isBalanced ? 'bg-emerald-50 border-success/30 text-success' : 'bg-red-50 border-danger/30 text-danger'
            }`}>
              <div>
                <div className="font-bold">
                  {isBalanced ? '✓ Capacity Balanced' : '⚠ Capacity Discrepancy'}
                </div>
                <div className="text-[11px] text-brandText mt-0.5">
                  Declared: <strong className="text-navy">{capacity}</strong> seats | Allocated: <strong className="text-navy">{totalAllocated}</strong> seats
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-[11px] font-bold ${
                isBalanced ? 'bg-success text-white' : 'bg-danger text-white'
              }`}>
                {isBalanced ? 'Ready' : `Diff: ${totalAllocated - capacity}`}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-brandBorder">
          <button
            type="button"
            onClick={() => navigate('/admin/flights')}
            className="px-5 py-2.5 text-xs font-semibold text-brandText hover:bg-surface-soft rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !isBalanced}
            className="px-8 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>{submitting ? 'Creating Flight Matrix...' : 'Dispatch Flight Schedule'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
