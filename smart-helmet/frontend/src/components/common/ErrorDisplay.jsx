import { AlertOctagon, RefreshCw } from 'lucide-react';

export default function ErrorDisplay({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertOctagon className="h-12 w-12 text-critical mb-3" />
      <p className="text-slate-200 font-medium mb-1">Error</p>
      <p className="text-slate-400 text-sm mb-4 text-center max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-accent/20 text-accent rounded-lg
                     hover:bg-accent/30 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}
