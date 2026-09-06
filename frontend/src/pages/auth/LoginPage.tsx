import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PlaneTakeoff, Lock, Mail, ArrowRight, Shield, ShieldCheck, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      await login({ email, password });
      showToast('success', 'Logged in successfully!');
      
      // Determine redirection based on credentials if default landing
      if (email.includes('admin') || email.includes('ops')) {
        navigate('/admin');
      } else {
        navigate(from === '/login' ? '/' : from);
      }
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-surface rounded-card border border-brandBorder shadow-card p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto shadow-md">
            <PlaneTakeoff className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">Sign In to SkyFlow</h1>
          <p className="text-xs text-muted">Access your passenger reservations or operations console</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g., admin@skyflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-medium rounded-lg border border-brandBorder bg-surface text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Roles Quick Fill */}
        <div className="pt-4 border-t border-brandBorder/60 space-y-2">
          <span className="block text-[11px] font-bold text-muted uppercase tracking-wider text-center">
            Quick Demo Login Credentials
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@skyflow.com', 'AdminPass123!')}
              className="p-2 rounded bg-surface-soft hover:bg-primary/10 text-navy text-[11px] font-medium border border-brandBorder/60 text-center transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
              <span>Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ops@skyflow.com', 'OpsPass123!')}
              className="p-2 rounded bg-surface-soft hover:bg-primary/10 text-navy text-[11px] font-medium border border-brandBorder/60 text-center transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
              <span>Ops Agent</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('passenger@skyflow.com', 'Pass123!')}
              className="p-2 rounded bg-surface-soft hover:bg-primary/10 text-navy text-[11px] font-medium border border-brandBorder/60 text-center transition-colors"
            >
              <User className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
              <span>Passenger</span>
            </button>
          </div>
        </div>

        {/* Register Footer */}
        <div className="text-center text-xs text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Register as Passenger
          </Link>
        </div>
      </div>
    </div>
  );
};
