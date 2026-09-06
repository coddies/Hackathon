import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface HoldTimerProps {
  expiresAt: string; // ISO datetime
  onExpired?: () => void;
}

export const HoldTimer: React.FC<HoldTimerProps> = ({ expiresAt, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiry = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
        if (onExpired) onExpired();
        return;
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const formattedTime = `${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;

  if (timeLeft.isExpired) {
    return (
      <div className="p-3 bg-red-50 border border-danger/30 rounded-card flex items-center justify-between text-danger">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">Seat hold has expired.</span>
        </div>
        <span className="text-xs">Please release or create a new hold.</span>
      </div>
    );
  }

  const isUrgent = timeLeft.minutes < 2;

  return (
    <div className={`p-3.5 rounded-card border transition-all flex items-center justify-between ${
      isUrgent ? 'bg-red-50 border-danger/40 text-danger' : 'bg-amber-50 border-warning/30 text-warning'
    }`}>
      <div className="flex items-center gap-2">
        <Clock className={`w-4 h-4 ${isUrgent ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-semibold text-navy">
          Your fare and seat are reserved
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};
