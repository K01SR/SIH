import { Link } from 'react-router-dom';
import { ArrowRight, Clock, FileText, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { STAGES, humanize } from '../utils';

const FEATURES = [
  {
    icon: FileText,
    title: 'Unified Case Management',
    desc: 'Single source of truth for every application from submission to final decision.',
  },
  {
    icon: Clock,
    title: 'Time-Bound Processing',
    desc: 'SLA tracking at every stage with automated escalation and breach alerts.',
  },
  {
    icon: Users,
    title: 'Role-Based Workflow',
    desc: 'Clear responsibilities for institutions, officers, committees, and authorities.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance & Audit',
    desc: 'Complete audit trail, document verification, and statutory compliance tracking.',
  },
];

const STATS = [
  { value: '90', label: 'Days target' },
  { value: '6', label: 'Route types' },
  { value: '7', label: 'User roles' },
  { value: '35+', label: 'Automated tests' },
];

const BENEFITS = [
  {
    title: 'Configurable workflow',
    desc: 'Rules are versioned data, not code — change a route without redeploying the chain.',
  },
  {
    title: 'Real-time pendency',
    desc: 'SLA clocks, breach forecasting and regional workload stay visible as they move.',
  },
  {
    title: 'Human oversight',
    desc: 'Every statutory decision remains with an accountable officer or committee.',
  },
  {
    title: 'Immutable audit trail',
    desc: 'Each action, document and hand-off is recorded across the entire case file.',
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const entry = user ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-ground/90 backdrop-blur">
        <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-5 py-4 sm:px-8" aria-label="Primary">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-accent text-[15px] font-semibold text-ground">
              A
            </span>
            <span className="leading-tight">
              <span className="block text-[14px] font-medium tracking-[-0.02em] text-ink">AICTE</span>
              <span className="label block text-ink-muted">Approval workflow</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {[
              ['Capabilities', '#capabilities'],
              ['Workflow', '#workflow'],
              ['Principles', '#principles'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-muted transition-colors duration-150 hover:text-accent"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link
              to={entry}
              className="text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
            >
              {user ? 'Dashboard' : 'Sign in'}
            </Link>
            <span className="hidden sm:block">
              <Link to={entry} className="btn btn-primary">
                {user ? 'Go to dashboard' : 'Get started'}
                <ArrowRight size={14} />
              </Link>
            </span>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="warm-glow pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-24">
            <div className="max-w-[640px]">
              <p className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-value" />
                Statutory approval workflow · SIH 2026
              </p>
              <h1 className="text-balance mt-7 font-display text-[clamp(52px,7vw,88px)] text-ink">
                Streamlined AICTE Approval <em>Workflow</em>
              </h1>
              <p className="mt-7 max-w-[520px] text-[16px] leading-[1.65] text-ink-muted">
                Automated, transparent, and time-bound approval processing for AICTE institutions.
                Track applications, manage reviews, and ensure compliance with complete visibility.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to={entry} className="btn btn-primary">
                  {user ? 'Open dashboard' : 'Start demo'}
                  <ArrowRight size={15} />
                </Link>
                <a href="#capabilities" className="btn">
                  View features
                </a>
              </div>
              <p className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#8f96a3]">
                Role-scoped access · Audited decisions · Configurable rules
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[470px] lg:mx-0">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden translate-x-[14px] translate-y-[14px] rounded-[5px] border border-line/80 sm:block"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden translate-x-[28px] translate-y-[28px] rounded-[5px] border border-line/40 sm:block"
              />
              <div className="subject-shadow relative rounded-[5px] border border-line bg-panel p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
                  <p className="label text-ink-muted">Register summary</p>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#8f96a3]">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-[#7bd8a6]" />
                    Live
                  </span>
                </div>

                <div className="mt-7">
                  <p className="font-mono text-[clamp(64px,9vw,88px)] font-medium leading-none tracking-[-0.06em] tabular-nums text-value">
                    90
                  </p>
                  <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
                    Day statutory target
                  </p>
                  <p className="mt-4 max-w-[330px] text-[13px] leading-[1.65] text-ink-muted">
                    The outer clock every application is measured against — from first submission
                    through to a recorded decision.
                  </p>
                </div>

                <dl className="mt-7 border-t border-line">
                  {STATS.slice(1).map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0"
                    >
                      <dt className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-muted">
                        {stat.label}
                      </dt>
                      <dd className="font-mono text-[17px] font-medium tabular-nums text-ink">{stat.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  {STAGES.slice(0, 4).map((stage, i) => (
                    <span key={stage} className="flex items-center gap-2">
                      {i > 0 && <span aria-hidden="true" className="h-px w-3 bg-line" />}
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#8f96a3]">
                        {humanize(stage)}
                      </span>
                    </span>
                  ))}
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-value">+ 2</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="At a glance" className="border-b border-line bg-ground-tint">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="bg-ground-tint px-5 py-8 sm:px-7">
                  <p className="font-mono text-[28px] font-medium leading-none tracking-[-0.05em] tabular-nums text-value sm:text-[32px]">
                    {stat.value}
                  </p>
                  <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-24">
            <div>
              <p className="label text-accent">The brief</p>
              <h2 className="mt-4 max-w-[440px] font-display text-[clamp(34px,4vw,48px)] text-ink">
                Everything you need for approval management
              </h2>
            </div>
            <div className="max-w-[620px] space-y-5 text-[16px] leading-[1.65] text-ink-muted">
              <p>
                Comprehensive tools for institutions, officers, and committees — arranged around
                the statutory chain rather than a pile of disconnected screens.
              </p>
              <p>
                The platform keeps pendency, documents, undertakings and escalations on one
                accountable record. Reviewers see the same case, the same clock and the same
                history, whichever route the application takes.
              </p>
            </div>
          </div>
        </section>

        <section id="capabilities" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="label text-accent">Capabilities</p>
                <h2 className="mt-4 font-display text-[clamp(32px,4vw,46px)] text-ink">
                  Four systems, one register
                </h2>
              </div>
              <p className="max-w-[360px] text-[14px] leading-[1.65] text-ink-muted">
                Each capability is part of the same case file, so nothing has to be reconciled
                between tools.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-[5px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature, i) => (
                <div key={feature.title} className="bg-panel p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-line bg-white/5 text-ink-muted">
                      <feature.icon size={17} />
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.08em] text-[#8f96a3]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-7 text-[17px] font-medium leading-snug tracking-[-0.02em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[13px] leading-[1.65] text-ink-muted">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 border-b border-line bg-ground-tint">
          <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="label text-accent">Statutory chain</p>
                <h2 className="mt-4 max-w-[560px] font-display text-[clamp(32px,4vw,46px)] text-ink">
                  Six stages. One accountable record.
                </h2>
              </div>
              <p className="max-w-[340px] text-[14px] leading-[1.65] text-ink-muted">
                Each hand-off carries its rules, documents and due date forward without losing
                the history behind it.
              </p>
            </div>

            <ol className="mt-12 grid sm:grid-cols-3 lg:grid-cols-6">
              {STAGES.map((stage, i) => (
                <li
                  key={stage}
                  className="relative border-l border-line pb-8 pl-6 last:pb-0 sm:border-l-0 sm:border-t sm:pb-0 sm:pl-0 sm:pt-6"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-[4.5px] top-1 h-2 w-2 rounded-[1px] bg-accent sm:left-0 sm:-top-[4.5px]"
                  />
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#8f96a3]">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-1.5 text-[14px] font-medium text-ink">{humanize(stage)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="principles" className="scroll-mt-20 border-b border-line">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20 lg:py-24">
            <div>
              <p className="label text-accent">Principles</p>
              <h2 className="mt-4 max-w-[380px] font-display text-[clamp(32px,4vw,46px)] text-ink">
                Built for the statutory chain
              </h2>
              <p className="mt-5 max-w-[360px] text-[14px] leading-[1.65] text-ink-muted">
                The workflow stays legible to the people who have to defend the decision later.
              </p>
            </div>

            <ol className="border-t border-line">
              {BENEFITS.map((benefit, i) => (
                <li
                  key={benefit.title}
                  className="grid gap-3 border-b border-line py-5 sm:grid-cols-[48px_1fr]"
                >
                  <span className="font-mono text-[10px] leading-6 tracking-[0.1em] text-[#8f96a3]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-[16px] font-medium tracking-[-0.02em] text-ink">
                      {benefit.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-[1.65] text-ink-muted">
                      {benefit.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-line bg-ground-tint">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_75%_at_50%_115%,rgba(255,149,31,0.28),transparent_68%)]"
          />
          <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:py-24">
            <p className="label text-accent">Next step</p>
            <h2 className="mt-4 max-w-[620px] font-display text-[clamp(34px,4.5vw,52px)] text-ink">
              Ready to streamline your approval process?
            </h2>
            <p className="mt-4 max-w-[520px] text-[15px] leading-[1.65] text-ink-muted">
              Experience the complete AICTE approval workflow automation system.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={entry} className="btn btn-primary">
                {user ? 'Go to dashboard' : 'Try demo'}
                <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="btn">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ground">
        <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-accent text-[13px] font-semibold text-ground">
                  A
                </span>
                <span className="text-[13px] font-medium text-ink">AICTE</span>
              </Link>
              <p className="mt-4 max-w-[210px] text-[12px] leading-[1.65] text-ink-muted">
                Approval workflow automation for institutions, officers and committees.
              </p>
            </div>

            <div>
              <p className="label text-ink-muted">Workflow</p>
              <ul className="mt-4 space-y-2.5 text-[13px]">
                {[
                  ['Dashboard', '/dashboard'],
                  ['Applications', '/applications'],
                  ['Alerts', '/alerts'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link to={href} className="text-ink-muted transition-colors duration-150 hover:text-accent">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="label text-ink-muted">Platform</p>
              <ul className="mt-4 space-y-2.5 text-[13px]">
                {[
                  ['Reports', '/reports'],
                  ['Rules', '/rules'],
                  ['Audit trail', '/audit'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link to={href} className="text-ink-muted transition-colors duration-150 hover:text-accent">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="label text-ink-muted">Project</p>
              <ul className="mt-4 space-y-2.5 text-[13px] text-ink-muted">
                <li>Smart India Hackathon 2026</li>
                <li>Demonstration build</li>
                <li>
                  <Link to="/login" className="transition-colors duration-150 hover:text-accent">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8f96a3]">
              © 2026 AICTE Approval Workflow Automation
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#8f96a3]">
              SIH 2026 · Demonstration
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
