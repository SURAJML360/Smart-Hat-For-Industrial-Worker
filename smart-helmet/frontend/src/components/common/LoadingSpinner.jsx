import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
      <Loader2 className="h-10 w-10 text-accent animate-spin mb-3" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}
