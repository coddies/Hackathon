import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string; height?: string }> = ({
  message = 'Loading data...',
  height = 'h-64'
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${height} text-center p-8`}>
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      <p className="text-sm font-medium text-brandText-muted">{message}</p>
    </div>
  );
};
