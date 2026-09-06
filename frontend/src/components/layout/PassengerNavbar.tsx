import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plane, LogOut, Ticket, ShieldCheck, Compass } from 'lucide-react';
import { RoleBadge } from '../ui/RoleBadge';

export const PassengerNavbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brandBorder shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm group-hover:bg-primary-hover transition-colors">
                <Plane className="w-5 h-5 -rotate-45" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-navy tracking-tight leading-none">
                  Sky<span className="text-primary">Flow</span>
                </span>
                <span className="text-[10px] font-semibold text-brandText-muted tracking-wider uppercase mt-0.5">
                  Airlines Control
                </span>
              </div>
            </Link>

            {/* Main Passenger Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/') ? 'bg-surface-soft text-primary font-bold' : 'text-navy hover:text-primary hover:bg-slate-50'
                }`}
              >
                <Compass className="w-4 h-4" />
                Find Flights
              </Link>
              <Link
                to="/my-bookings"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/my-bookings') ? 'bg-surface-soft text-primary font-bold' : 'text-navy hover:text-primary hover:bg-slate-50'
                }`}
              >
                <Ticket className="w-4 h-4" />
                My Bookings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 text-purple-700 hover:bg-purple-50"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Admin Center
                </Link>
              )}
            </nav>
          </div>

          {/* Right Action / Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-navy">{user.full_name || user.email}</span>
                  <div className="mt-0.5">
                    <RoleBadge role={user.role} size="sm" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title="Sign Out"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brandBorder text-xs font-semibold text-brandText-muted hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-navy hover:text-primary hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-primary hover:bg-primary-hover text-white shadow-sm transition-all"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
