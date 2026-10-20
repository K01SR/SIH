import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api/client';

const DEMO_ACCOUNTS = [
  { email: 'admin@aicte.gov.in', role: 'Admin / Configurator' },
  { email: 'ca@aicte.gov.in', role: 'Competent Authority' },
  { email: 'bo.north@aicte.gov.in', role: 'Bureau Officer' },
  { email: 'ro.west@aicte.gov.in', role: 'Regional Officer' },
  { email: 'evc1@aicte.gov.in', role: 'EVC Member' },
  { email: 'college@ltce.edu', role: 'Institution' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('ro.west@aicte.gov.in');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-blue-700 p-8 text-white md:flex">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-xl font-bold">
              A
            </div>
            <h1 className="mt-6 text-2xl font-bold leading-snug">
              AICTE Approval Workflow Automation
            </h1>
            <p className="mt-3 text-sm text-blue-100">
              Integrated platform for approval processing, compliance monitoring and alert
              management across Regions, stages and officers.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-blue-100">
            <li>✓ Configurable workflow (rules as data)</li>
            <li>✓ Real-time pendency &amp; SLA monitoring</li>
            <li>✓ EVC scheduling &amp; escalation</li>
            <li>✓ Undertaking &amp; document expiry tracking</li>
            <li>✓ Human oversight for statutory decisions</li>
          </ul>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Access your role-based dashboard</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Demo accounts (password: password123)
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => setEmail(a.email)}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100"
                >
                  <span className="font-mono">{a.email}</span>
                  <span className="text-slate-400">{a.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
