import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../api/client';
import { humanize } from '../utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/applications', label: 'Applications', icon: <FileText size={18} /> },
  { to: '/evc', label: 'EVC Scheduling', icon: <CalendarCheck size={18} />, roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'EVC_MEMBER', 'COMMITTEE_MEMBER', 'ADMIN'] },
  { to: '/undertakings', label: 'Undertakings', icon: <ClipboardList size={18} /> },
  { to: '/documents', label: 'Documents & Leases', icon: <FileWarning size={18} /> },
  { to: '/alerts', label: 'Alerts & Escalation', icon: <Bell size={18} /> },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={18} />, roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN', 'REGIONAL_OFFICER'] },
  { to: '/simulation', label: 'Simulation', icon: <LineChart size={18} />, roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'] },
  { to: '/audit', label: 'Audit Trail', icon: <ScrollText size={18} />, roles: ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'] },
  { to: '/rules', label: 'Rules Configuration', icon: <Settings2 size={18} />, roles: ['ADMIN', 'COMPETENT_AUTHORITY'] },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useRealtime();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refreshUnread = () =>
      api
        .get('/alerts', { params: { isRead: 'false' } })
        .then((res) => setUnread(res.data.data.length))
        .catch(() => {});
    refreshUnread();
    // The server only delivers alerts this user is entitled to see, but the
    // count is re-read rather than incremented so it cannot drift.
    const onAlert = () => refreshUnread();
    window.addEventListener('aicte:alert', onAlert);
    return () => window.removeEventListener('aicte:alert', onAlert);
  }, []);

  if (!user) return null;

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            A
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">AICTE Workflow</p>
            <p className="text-[11px] text-slate-500">Approval Automation</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.to === '/alerts' && unread > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <Menu size={22} />
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">
            Integrated Approval Workflow, Compliance Monitoring &amp; Alert Management
          </div>
          <div className="flex items-center gap-4">
            <span
              title={connected ? 'Real-time connected' : 'Real-time disconnected'}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500"
            >
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-300'}`} aria-hidden="true" />
              {connected ? 'Live' : 'Offline'}
              <span className="sr-only">
                {connected ? 'Real-time connection active' : 'Real-time connection offline'}
              </span>
            </span>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
              <p className="text-xs text-slate-500">
                {humanize(user.role)}
                {user.region ? ` · ${humanize(user.region)}` : ''}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
