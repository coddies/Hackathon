import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Plane,
  PlusCircle,
  Ticket,
  RotateCcw,
  Users,
  ScrollText,
  Workflow,
  LogOut,
  ChevronLeft,
  PlaneTakeoff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/RoleBadge';

export const AdminSidebar: React.FC = () => {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Command Center', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Flights', path: '/admin/flights', icon: Plane, exact: true },
    ...(isSuperAdmin
      ? [{ name: 'Create Flight', path: '/admin/flights/new', icon: PlusCircle, exact: false }]
      : []),
    { name: 'Bookings', path: '/admin/bookings', icon: Ticket, exact: false },
    { name: 'Refund Queue', path: '/admin/refunds', icon: RotateCcw, exact: false },
    { name: 'Waitlist Queue', path: '/admin/waitlist', icon: Users, exact: false },
    ...(isSuperAdmin
      ? [{ name: 'Audit Logs', path: '/admin/audit-logs', icon: ScrollText, exact: false }]
      : []),
    { name: 'Automations', path: '/admin/automations', icon: Workflow, exact: false },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-brandBorder min-h-screen flex flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-brandBorder flex items-center justify-between">
          <NavLink to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
              <PlaneTakeoff className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-navy tracking-tight">SkyFlow</span>
              <span className="block text-[10px] uppercase tracking-wider text-muted font-semibold">
                Operations Portal
              </span>
            </div>
          </NavLink>
        </div>

        {/* User Info Card */}
        <div className="p-4 mx-3 my-3 bg-surface-soft rounded-card border border-brandBorder/60">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs font-semibold text-navy truncate">
              {user?.full_name || user?.email || 'Operations Agent'}
            </div>
            {user?.role && <RoleBadge role={user.role} />}
          </div>
          <div className="text-[11px] text-muted truncate">{user?.email}</div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm font-semibold'
                      : 'text-brandText hover:bg-surface-soft hover:text-navy'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer controls */}
      <div className="p-3 border-t border-brandBorder space-y-1">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted hover:text-navy hover:bg-surface-soft transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Switch to Passenger View</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
