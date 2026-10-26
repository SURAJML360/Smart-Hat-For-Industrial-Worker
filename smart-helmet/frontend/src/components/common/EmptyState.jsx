import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data',
  message = 'Nothing to display yet.',
  action,
  actionLabel = 'Get started',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-14 w-14 text-slate-600 mb-4" />
      <p className="text-slate-300 font-medium text-lg mb-1">{title}</p>
      <p className="text-slate-500 text-sm max-w-sm mb-4">{message}</p>
      {action && (
        <button
          onClick={action}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg
                     hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
