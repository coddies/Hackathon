import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Calendar, Users, ArrowRight } from 'lucide-react';
import { AirportSelect } from '../../components/ui/AirportSelect';
import { TrustCards } from '../../components/shared/TrustCards';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip'>('oneway');
  const [origin, setOrigin] = useState('LHE');
  const [destination, setDestination] = useState('DXB');
  
  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [departureDate, setDepartureDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [passengers, setPassengers] = useState(1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !departureDate) return;
    
    if (!isAuthenticated) {
      showToast('warning', 'Please sign in or create an account to search flights and manage bookings.');
      navigate('/login');
      return;
    }
    
    navigate(`/search?origin=${origin}&destination=${destination}&date=${departureDate}&passengers=${passengers}`);
  };

  const handleSwapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pt-4 pb-12">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Plane className="w-3.5 h-3.5" />
          <span>Real-time Airline Reservation Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy tracking-tight">
          Your journey, clearly managed.
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
          Experience seamless flight booking, live seat selection, transparent hold guarantees, and instant operations control.
        </p>
      </div>

      {/* Flight Search Card */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 relative">
        {/* Toggle UI */}
        <div className="flex items-center gap-4 mb-6 border-b border-brandBorder/60 pb-4">
          <button
            type="button"
            onClick={() => setTripType('oneway')}
            className={`text-xs font-bold pb-1 transition-colors relative ${
              tripType === 'oneway' ? 'text-primary' : 'text-muted hover:text-navy'
            }`}
          >
            One-way
            {tripType === 'oneway' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTripType('roundtrip')}
            className={`text-xs font-bold pb-1 transition-colors relative ${
              tripType === 'roundtrip' ? 'text-primary' : 'text-muted hover:text-navy'
            }`}
          >
            Round-trip
            {tripType === 'roundtrip' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
            )}
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Origin */}
            <div className="md:col-span-5">
              <AirportSelect
                label="From (Origin)"
                value={origin}
                onChange={setOrigin}
              />
            </div>

            {/* Swap Button */}
            <div className="md:col-span-2 flex items-center justify-center pt-5">
              <button
                type="button"
                onClick={handleSwapAirports}
                className="w-10 h-10 rounded-full border border-brandBorder bg-surface-soft hover:bg-primary/10 hover:text-primary text-muted flex items-center justify-center transition-all shadow-xs"
                title="Swap Origin and Destination"
              >
                ⇄
              </button>
            </div>

            {/* Destination */}
            <div className="md:col-span-5">
              <AirportSelect
                label="To (Destination)"
                value={destination}
                onChange={setDestination}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {/* Departure Date */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Departure Date</span>
              </label>
              <input
                type="date"
                required
                value={departureDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Passengers */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Passengers</span>
              </label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Adult Passenger' : 'Passengers'}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Submit */}
            <div className="sm:col-span-2 md:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full h-10 px-5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Search Flights</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Quick Route Shortcuts */}
        <div className="mt-6 pt-4 border-t border-brandBorder/60 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted font-medium">Popular routes:</span>
          <button
            type="button"
            onClick={() => { setOrigin('LHE'); setDestination('DXB'); }}
            className="px-2.5 py-1 rounded bg-surface-soft hover:bg-primary/10 text-brandText hover:text-primary font-medium transition-colors"
          >
            Lahore (LHE) → Dubai (DXB)
          </button>
          <button
            type="button"
            onClick={() => { setOrigin('LHR'); setDestination('JFK'); }}
            className="px-2.5 py-1 rounded bg-surface-soft hover:bg-primary/10 text-brandText hover:text-primary font-medium transition-colors"
          >
            London (LHR) → New York (JFK)
          </button>
          <button
            type="button"
            onClick={() => { setOrigin('KHI'); setDestination('IST'); }}
            className="px-2.5 py-1 rounded bg-surface-soft hover:bg-primary/10 text-brandText hover:text-primary font-medium transition-colors"
          >
            Karachi (KHI) → Istanbul (IST)
          </button>
        </div>
      </div>

      {/* Trust Cards */}
      <div className="pt-4">
        <TrustCards />
      </div>
    </div>
  );
};
