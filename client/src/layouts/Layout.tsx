import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  CalendarCheck,
  ClipboardList,
  FileWarning,
  Bell,
  Settings2,
  ScrollText,
  BarChart3,
  LogOut,
  Menu,
  LineChart,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../api/client';
import { cn, humanize } from '../utils';
import type { User } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
      { to: '/applications', label: 'Applications', icon: <FileText size={17} /> },
    ],
  },
  {
    label: 'Processing',
    items: [
      {
        to: '/evc',
        label: 'EVC Scheduling',
        icon: <CalendarCheck size={17} />,
        roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'EVC_MEMBER', 'COMMITTEE_MEMBER', 'ADMIN'],
      },
      { to: '/undertakings', label: 'Undertakings', icon: <ClipboardList size={17} /> },
      { to: '/documents', label: 'Documents & Leases', icon: <FileWarning size={17} /> },
      { to: '/alerts', label: 'Alerts & Escalation', icon: <Bell size={17} /> },
    ],
  },
  {
    label: 'Analysis',
    items: [
      {
        to: '/reports',
        label: 'Reports',
        icon: <BarChart3 size={17} />,
        roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN', 'REGIONAL_OFFICER'],
      },
      {
        to: '/simulation',
        label: 'Simulation',
        icon: <LineChart size={17} />,
        roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'],
      },
      {
        to: '/audit',
        label: 'Audit Trail',
        icon: <ScrollText size={17} />,
        roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'],
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        to: '/rules',
        label: 'Rules Configuration',
        icon: <Settings2 size={17} />,
        roles: ['ADMIN', 'COMPETENT_AUTHORITY'],
      },
    ],
  },
];

function initials(name?: string) {
  if (!name) return '—';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-accent text-[15px] font-semibold text-ground">
        A
      </span>
      <div className="leading-tight">
        <p className="text-[14px] font-medium tracking-[-0.02em] text-ink">AICTE</p>
        <p className="label mt-0.5 text-ink-muted">Approval workflow</p>
      </div>
    </div>
  );
}

function Navigation({
  user,
  connected,
  unread,
  onLogout,
}: {
  user: User;
  connected: boolean;
  unread: number;
  onLogout: () => void;
}) {
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div className="flex h-[72px] items-center border-b border-line px-5">
        <Wordmark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label="Main navigation">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-7 last:mb-0">
            <p className="label mb-2 px-3 text-ink-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-[5px] px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-accent/10 text-accent shadow-[inset_2px_0_0_var(--accent)]'
                        : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'shrink-0',
                          isActive ? 'text-accent' : 'text-[#8f96a3] group-hover:text-ink-muted'
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.to === '/alerts' && unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-[3px] bg-accent px-1.5 font-mono text-[10px] font-medium text-ground">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-[5px] px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-line bg-[rgba(237,205,140,0.12)] font-mono text-[11px] font-medium text-value">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12.5px] font-medium text-ink">{user.fullName}</p>
            <p className="truncate font-mono text-[10px] text-ink-muted">
              {humanize(user.role)}
              {user.region ? ` · ${humanize(user.region)}` : ''}
            </p>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[#8f96a3] transition-colors duration-150 hover:bg-white/5 hover:text-danger"
          >
            <LogOut size={16} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.06em] text-[#8f96a3]">
          <span
            aria-hidden="true"
            className={cn('h-1.5 w-1.5 rounded-[1px]', connected ? 'bg-[#7bd8a6]' : 'bg-line')}
          />
          {connected ? 'Live connection' : 'Offline'}
          <span className="ml-auto flex items-center gap-1.5">
            <ShieldCheck size={11} /> Secure
          </span>
        </div>
      </div>
    </>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refreshUnread = () =>
      api
        .get('/alerts', { params: { isRead: 'false' } })
        .then((res) => setUnread(res.data.data.length))
        .catch(() => {});
    refreshUnread();
    const onAlert = () => refreshUnread();
    window.addEventListener('aicte:alert', onAlert);
    return () => window.removeEventListener('aicte:alert', onAlert);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-ground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-[5px] focus:border focus:border-accent focus:bg-panel focus:px-4 focus:py-2 focus:text-[13px] focus:text-ink"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-ground-tint lg:flex">
        <Navigation user={user} connected={connected} unread={unread} onLogout={handleLogout} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ground/85 backdrop-blur-sm"
          />
          <aside className="animate-slide-in-right absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-line bg-ground-tint">
            <div className="absolute right-3 top-3 z-10">
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#8f96a3] hover:bg-white/5 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <Navigation user={user} connected={connected} unread={unread} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ground/95 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-line text-ink-muted"
          >
            <Menu size={18} />
          </button>
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-accent text-[11px] font-semibold text-ground">
              A
            </span>
            <span className="text-[14px] font-medium text-ink">AICTE</span>
          </NavLink>
          <div className="ml-auto flex items-center gap-2">
            {unread > 0 && (
              <NavLink
                to="/alerts"
                className="relative flex h-9 w-9 items-center justify-center rounded-[4px] text-ink-muted hover:bg-white/5"
                aria-label={`${unread} unread alerts`}
              >
                <Bell size={18} />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-[1px] bg-accent" />
              </NavLink>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-line bg-[rgba(237,205,140,0.12)] font-mono text-[10px] font-medium text-value">
              {initials(user.fullName)}
            </span>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto min-h-screen w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div key={location.pathname} className="animate-page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
