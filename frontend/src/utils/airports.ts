export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const POPULAR_AIRPORTS: Airport[] = [
  { code: 'LHE', name: 'Allama Iqbal International Airport', city: 'Lahore', country: 'Pakistan' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' },
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
  { code: 'ISB', name: 'Islamabad International Airport', city: 'Islamabad', country: 'Pakistan' },
  { code: 'KHI', name: 'Jinnah International Airport', city: 'Karachi', country: 'Pakistan' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
  { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
  { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
];

// Alias so pages using DEFAULT_AIRPORTS still work
export const DEFAULT_AIRPORTS = POPULAR_AIRPORTS;

export function getAirportByCode(code: string): Airport {
  const found = POPULAR_AIRPORTS.find(a => a.code.toUpperCase() === code.toUpperCase());
  if (found) return found;
  return {
    code: code.toUpperCase(),
    name: `${code.toUpperCase()} Airport`,
    city: code.toUpperCase(),
    country: 'International'
  };
}

/** Returns the city name for an airport code */
export function getAirportCity(code: string): string {
  return getAirportByCode(code).city;
}

/** Returns the full airport name for an airport code */
export function getAirportName(code: string): string {
  return getAirportByCode(code).name;
}
