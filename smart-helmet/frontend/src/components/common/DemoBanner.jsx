import { AlertTriangle } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';

export default function DemoBanner() {
  const { isDemoMode } = useDemo();
  if (!isDemoMode) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2
                    bg-gradient-to-r from-amber-600/90 to-orange-600/90 text-white text-sm font-medium
                    backdrop-blur-sm">
      <AlertTriangle className="h-4 w-4" />
      ⚠️ DEMO MODE — Displaying simulated data
    </div>
  );
}
