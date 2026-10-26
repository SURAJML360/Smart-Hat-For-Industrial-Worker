import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Activity, HardHat, AlertTriangle,
  BarChart3, Settings, Wrench, User, LogOut, ChevronLeft, ChevronRight, X, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/monitor', icon: Activity, label: 'Live Monitor' },
  { to: '/helmets', icon: HardHat, label: 'Helmets' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/diagnostics', icon: Wrench, label: 'Diagnostics' },
  { to: '/account', icon: User, label: 'Account' },
];

export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }) {
  const { logout } = useAuth();

  const linkClasses = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
     ${isActive
        ? 'bg-accent/15 text-accent'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`;

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="flex-shrink-0 w-9 h-9 bg-accent/20 rounded-lg flex items-center justify-center">
          <Shield className="h-5 w-5 text-accent" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-100 truncate">Smart Helmet</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Industrial Safety</p>
          </div>
        )}
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="ml-auto lg:hidden text-slate-400 hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onMobileClose}
            className={({ isActive }) => linkClasses(isActive)}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        {/* Collapse toggle – desktop only */}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400
                     hover:text-slate-200 hover:bg-white/5 transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400
                     hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0d1321] border-r border-slate-800
                    transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-60'}`}
      >
        {content}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-[#0d1321] border-r border-slate-800
                    transform transition-transform duration-300 lg:hidden
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {content}
      </aside>
    </>
  );
}
