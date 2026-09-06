import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchFlightsApi } from '../../api/flights';
import type { FlightListItem } from '../../types';
import { FlightCard } from '../../components/shared/FlightCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { AirportSelect } from '../../components/ui/AirportSelect';
import { formatDate } from '../../utils/formatters';
import { Plane, Calendar, Users, SlidersHorizontal, ArrowLeft } from 'lucide-react';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const date = searchParams.get('date') || '';
  const passengers = parseInt(searchParams.get('passengers') || '1', 10);

  const [flights, setFlights] = useState<FlightListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingSearch, setIsEditingSearch] = useState(false);

  // Editable search states
  const [editOrigin, setEditOrigin] = useState(origin);
  const [editDestination, setEditDestination] = useState(destination);
  const [editDate, setEditDate] = useState(date);
  const [editPassengers, setEditPassengers] = useState(passengers);

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchFlightsApi({
        origin: origin || undefined,
        destination: destination || undefined,
        date: date || undefined,
        passengers: passengers || 1,
      });
      setFlights(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to retrieve available flights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
    setEditOrigin(origin);
    setEditDestination(destination);
    setEditDate(date);
    setEditPassengers(passengers);
  }, [origin, destination, date, passengers]);

  const handleApplyNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({
      origin: editOrigin,
      destination: editDestination,
      date: editDate,
      passengers: editPassengers.toString(),
    });
    setIsEditingSearch(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Search Summary Header Bar */}
      <div className="bg-surface rounded-card border border-brandBorder shadow-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-navy text-sm">
              <span className="px-2 py-1 bg-primary/10 text-primary rounded">{origin || 'ANY'}</span>
              <span>→</span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded">{destination || 'ANY'}</span>
            </div>

            <div className="h-4 w-px bg-brandBorder hidden sm:block"></div>

            <div className="flex items-center gap-1.5 text-muted">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-navy">{date ? formatDate(date) : 'Any Date'}</span>
            </div>

            <div className="h-4 w-px bg-brandBorder hidden sm:block"></div>

            <div className="flex items-center gap-1.5 text-muted">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-navy">{passengers} {passengers === 1 ? 'Passenger' : 'Passengers'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingSearch(!isEditingSearch)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-brandBorder bg-surface-soft hover:bg-surface text-navy flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>{isEditingSearch ? 'Close Filter' : 'Change Search'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Edit Search Bar */}
        {isEditingSearch && (
          <form onSubmit={handleApplyNewSearch} className="mt-5 pt-5 border-t border-brandBorder/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
            <AirportSelect
              label="From"
              value={editOrigin}
              onChange={setEditOrigin}
            />
            <AirportSelect
              label="To"
              value={editDestination}
              onChange={setEditDestination}
            />
            <div>
              <label className="block text-xs font-semibold text-navy mb-1.5">Date</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-brandBorder bg-surface text-navy"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full h-9 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors"
              >
                Update Results
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
          Available Flights {!loading && `(${flights.length})`}
        </h2>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-muted hover:text-navy flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Search</span>
        </button>
      </div>

      {/* Main List / States */}
      {loading ? (
        <LoadingState message="Checking live airline schedules and seat inventories..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchFlights} />
      ) : flights.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No flights found for this route and date."
          description={`We couldn't find any scheduled flights matching ${origin} → ${destination} on ${date || 'the selected date'}. Try changing airports or dates.`}
          actionLabel="Search All Available Routes"
          onAction={() => {
            setSearchParams({});
          }}
        />
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => (
            <FlightCard key={flight.id} flight={flight} />
          ))}
        </div>
      )}
    </div>
  );
};
