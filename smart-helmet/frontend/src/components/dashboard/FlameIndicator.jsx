import { Flame, ShieldCheck, HelpCircle } from 'lucide-react';

/**
 * FlameIndicator – shows flame status as a visual icon + label.
 * - detected === true → red pulse
 * - detected === false → green safe
 * - detected is null/undefined → gray unknown
 */
export default function FlameIndicator({ detected, size = 'md', showLabel = true }) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-14 w-14',
  };

  const iconSize = sizeClasses[size] || sizeClasses.md;

  if (detected === true) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-flame-pulse">
          <Flame className={`${iconSize} text-critical drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]`} />
        </div>
        {showLabel && (
          <span className="text-sm font-semibold text-critical uppercase tracking-wide">
            Flame Detected
          </span>
        )}
      </div>
    );
  }

  if (detected === false) {
    return (
      <div className="flex items-center gap-2">
        <ShieldCheck className={`${iconSize} text-safe`} />
        {showLabel && (
          <span className="text-sm font-medium text-safe">No Flame</span>
        )}
      </div>
    );
  }

  // Unknown / offline
  return (
    <div className="flex items-center gap-2">
      <HelpCircle className={`${iconSize} text-slate-500`} />
      {showLabel && (
        <span className="text-sm font-medium text-slate-500">Unknown</span>
      )}
    </div>
  );
}
