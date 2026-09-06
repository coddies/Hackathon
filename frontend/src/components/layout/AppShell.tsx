import { Outlet } from 'react-router-dom';
import { PassengerNavbar } from './PassengerNavbar';
import { AdminSidebar } from './AdminSidebar';
import { PlaneTakeoff, ShieldCheck } from 'lucide-react';

export const PassengerLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-brandText antialiased">
      <PassengerNavbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="bg-surface border-t border-brandBorder py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center">
              <PlaneTakeoff className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-navy text-sm">SkyFlow</span>
            <span>— Book with confidence. Operate with control.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Production Railway FastAPI v1.0</span>
            <div className="flex items-center gap-1 text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span>Backend Connected</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex font-sans text-brandText antialiased">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Admin top status bar */}
        <header className="h-14 bg-surface border-b border-brandBorder px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-navy">
              SkyFlow Operations Command Center
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-success/10 text-success border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              Live Operations Mode
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
