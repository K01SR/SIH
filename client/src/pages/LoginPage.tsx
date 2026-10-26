import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api/client';
import { Button, Field, Input } from '../components/ui';

const DEMO_ACCOUNTS = [
  { email: 'admin@aicte.gov.in', role: 'Admin / Configurator' },
  { email: 'ca@aicte.gov.in', role: 'Competent Authority' },
  { email: 'bo.north@aicte.gov.in', role: 'Bureau Officer' },
  { email: 'ro.west@aicte.gov.in', role: 'Regional Officer' },
  { email: 'evc1@aicte.gov.in', role: 'EVC Member' },
  { email: 'college@ltce.edu', role: 'Institution' },
];

const POINTS = [
  'Configurable workflow — rules are versioned data, not code',
  'Real-time pendency, SLA clocks and breach forecasting',
  'Human oversight for every statutory decision',
  'Immutable audit trail across the entire case file',
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('ro.west@aicte.gov.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
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

  const pickAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-ground text-ink lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-ground-tint px-12 py-10 lg:flex lg:flex-col xl:px-20">
        <div aria-hidden="true" className="warm-glow pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #f4f5f7 1px, transparent 1px), linear-gradient(to bottom, #f4f5f7 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <Link to="/" className="relative z-10 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-accent text-[15px] font-semibold text-ground">
            A
          </span>
          <span className="leading-tight">
            <span className="block text-[14px] font-medium tracking-[-0.02em] text-ink">AICTE</span>
            <span className="label block text-ink-muted">Approval workflow</span>
          </span>
        </Link>

        <div className="relative z-10 my-auto max-w-lg py-16">
          <p className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-value" />
            Demonstration environment · 2026
          </p>
          <h1 className="mt-6 font-display text-[clamp(42px,4.6vw,62px)] text-ink">
            The statutory chain,
            <br />
            <em>made legible.</em>
          </h1>
          <p className="mt-6 max-w-[430px] text-[15px] leading-[1.65] text-ink-muted">
            One integrated platform for approval processing, compliance monitoring and alert
            management across regions, stages and officers.
          </p>

          <ul className="mt-10 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[13.5px] leading-[1.65] text-ink-muted">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-line bg-[rgba(237,205,140,0.12)] text-value">
                  <Check size={11} strokeWidth={2.5} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#8f96a3]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} /> Role-scoped access
          </span>
          <span>Authenticated sessions</span>
          <span>Full audit trail</span>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col bg-ground">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end lg:px-10">
          <Link to="/" className="flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-accent text-[13px] font-semibold text-ground">
              A
            </span>
            <span className="text-[13px] font-medium text-ink">AICTE</span>
          </Link>
          <Link
            to="/"
            className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-muted transition-colors duration-150 hover:text-accent"
          >
            Back to overview
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-[430px]">
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden translate-x-3 translate-y-3 rounded-[5px] border border-line/80 sm:block"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden translate-x-6 translate-y-6 rounded-[5px] border border-line/40 sm:block"
              />

              <div className="subject-shadow relative rounded-[5px] border border-line bg-panel p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4 border-b border-line pb-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-line bg-white/5 text-accent">
                    <ShieldCheck size={17} />
                  </span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#8f96a3]">
                    Secure entry
                  </span>
                </div>

                <h2 className="mt-6 text-[28px] font-medium leading-none tracking-[-0.04em] text-ink">
                  Sign in
                </h2>
                <p className="mt-3 text-[13px] leading-[1.65] text-ink-muted">
                  Use your role credentials to enter the workflow.
                </p>

                <form onSubmit={submit} className="mt-7 space-y-5">
                  <Field label="Email address">
                    <div className="relative">
                      <Mail
                        size={15}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8f96a3]"
                      />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        className="pl-11"
                        required
                      />
                    </div>
                  </Field>

                  <Field label="Password">
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#8f96a3] transition-colors duration-150 hover:bg-white/5 hover:text-ink"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-[4px] border border-[rgba(255,138,122,0.32)] bg-[rgba(255,138,122,0.1)] px-3.5 py-2.5 text-[12.5px] font-medium text-[#ff9b8d]"
                    >
                      {error}
                    </p>
                  )}

                  <Button type="submit" variant="primary" className="mt-1 w-full" loading={loading}>
                    {loading ? 'Signing in' : 'Sign in'}
                    {!loading && <ArrowRight size={15} />}
                  </Button>
                </form>

                <div className="mt-7 border-t border-line pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="label text-ink-muted">Demo accounts</p>
                    <span className="rounded-[3px] border border-line bg-white/5 px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                      password123
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {DEMO_ACCOUNTS.map((account) => {
                      const active = email === account.email;
                      return (
                        <button
                          key={account.email}
                          type="button"
                          onClick={() => pickAccount(account.email)}
                          aria-pressed={active}
                          className={`rounded-[4px] border px-3 py-2.5 text-left transition-colors duration-150 ${
                            active
                              ? 'border-accent bg-accent/10'
                              : 'border-line bg-ground-tint hover:border-[rgba(255,149,31,0.5)]'
                          }`}
                        >
                          <span className="block truncate font-mono text-[10.5px] text-ink">
                            {account.email}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-ink-muted">
                            {account.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-[11px] leading-[1.6] text-ink-muted">
                    Select any account to fill the form. Every account uses{' '}
                    <span className="font-mono text-value">password123</span>.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#8f96a3]">
              Smart India Hackathon 2026 · Demonstration build
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
