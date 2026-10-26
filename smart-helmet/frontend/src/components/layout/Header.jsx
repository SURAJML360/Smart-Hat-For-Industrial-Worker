import { useLocation } from 'react-router-dom';
import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { useSocketCtx } from '../../context/SocketContext';
import useSocket from '../../hooks/useSocket';
import { useState, useEffect } from 'react';

const pageTitles = {
  '/': 'Dashboard',
  '/monitor': 'Live Monitor',
  '/helmets': 'Helmets',
  '/alerts': 'Alerts',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/diagnostics': 'Diagnostics',
  '/account': 'Account',
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { connected } = useSocketCtx();
  const [alertCount, setAlertCount] = useState(0);

  const newAlert = useSocket('alert:new');
  useEffect(() => {
    if (newAlert) setAlertCount((c) => c + 1);
  }, [newAlert]);

  // Find page title – handle nested routes like /helmets/:id
  const pathBase = '/' + (location.pathname.split('/')[1] || '');
  const title = pageTitles[pathBase] || pageTitles[location.pathname] || 'Smart Helmet';

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'SH';

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-[#111827] border-b border-slate-800">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-400 hover:text-slate-200 focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {isDemoMode && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px]
                           font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Demo
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Socket status */}
        <div title={connected ? 'Real-time connected' : 'Real-time disconnected'}>
          {connected ? (
            <Wifi className="h-4 w-4 text-safe" />
          ) : (
            <WifiOff className="h-4 w-4 text-offline" />
          )}
        </div>

        {/* Alert bell */}
        <button
          className="relative text-slate-400 hover:text-slate-200 focus:outline-none"
          title="Alerts"
          onClick={() => window.location.href = '/alerts'}
        >
          <Bell className="h-5 w-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-[16px]
                             px-1 bg-critical text-white text-[10px] font-bold rounded-full">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center
                          text-accent text-xs font-bold">
            {initials}
          </div>
          <span className="hidden sm:block text-sm text-slate-300 max-w-[120px] truncate">
            {user?.email || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}
