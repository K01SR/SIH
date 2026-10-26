import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { AlertTriangle, Clock, FileCheck2, Layers, ArrowUpRight, TrendingUp } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Meter,
  PageHeader,
  Skeleton,
  StatCard,
} from '../components/ui';
import { humanize } from '../utils';
import type { DashboardSummary } from '../types';

const INK = '#edcd8c';
const PIGMENT = '#ff951f';
const MUTED = '#8f96a3';
const HAIRLINE = '#303139';

const BUCKET_COLORS: Record<string, string> = {
  green: '#7bd8a6',
  yellow: '#edcd8c',
  orange: '#ff951f',
  red: '#ff8a7a',
};

const AXIS_TICK = { fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fill: MUTED };

const TOOLTIP_STYLE = {
  background: '#10141c',
  border: `1px solid ${HAIRLINE}`,
  borderRadius: 5,
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 11,
  color: '#f4f5f7',
  padding: '8px 10px',
  boxShadow: '0 18px 50px -24px rgba(255,149,31,0.35)',
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [regions, setRegions] = useState<Record<string, { total: number; breached: number }>>({});
  const [predictive, setPredictive] = useState<
    { applicationNumber: string; institution: string; daysRemaining: number; risk: string; stage: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/applications/dashboard'),
      api.get('/applications/analytics/regions'),
      api.get('/applications/analytics/predictive'),
    ])
      .then(([d, r, p]) => {
        setData(d.data.data);
        setRegions(r.data.data);
        setPredictive(p.data.data.slice(0, 6));
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="mt-3 h-8 w-80" />
          <Skeleton className="mt-3 h-2.5 w-96 max-w-full" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[5px] border border-line bg-panel p-5">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="mt-4 h-8 w-20" />
              <Skeleton className="mt-4 h-2.5 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          subtitle="Real-time pendency, SLA status and workload overview."
        />
        <EmptyState
          icon={<AlertTriangle size={26} />}
          message="Unable to load dashboard"
          hint={error || 'The analytics service did not respond.'}
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  const isInstitution = user?.role === 'INSTITUTION';
  const ageingChart = data.ageing.buckets.map((b) => ({
    name: b.label,
    count: b.count,
    color: BUCKET_COLORS[b.color],
  }));
  const stageChart = Object.entries(data.ageing.byStage).map(([name, value]) => ({
    name: humanize(name),
    value,
  }));
  const maxStage = Math.max(1, ...stageChart.map((s) => s.value));
  const regionChart = Object.entries(regions).map(([name, v]) => ({
    name: humanize(name),
    Pending: v.total,
    Breached: v.breached,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`${humanize(user?.role ?? '')} dashboard`}
        subtitle="Real-time pendency, statutory SLA status and workload across regions."
        actions={
          <>
            {isInstitution ? (
              <Button variant="primary" onClick={() => navigate('/applications')}>
                View applications
              </Button>
            ) : (
              <Button
                icon={<TrendingUp size={13} />}
                onClick={() => navigate('/simulation')}
              >
                Run simulation
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total applications"
          value={data.summary.total}
          icon={<Layers size={15} />}
          sub="Across the full register in your scope"
        />
        <StatCard
          label="Pending"
          value={data.summary.pending}
          icon={<Clock size={15} />}
          sub="Open at some stage of the chain"
        />
        <StatCard
          label="SLA breached"
          value={data.summary.breached}
          icon={<AlertTriangle size={15} />}
          accent
          sub="Requires immediate attention"
        />
        <StatCard
          label="Approved"
          value={data.summary.approved}
          icon={<FileCheck2 size={15} />}
          sub="Closed with a favourable decision"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" flush>
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-blue-600">Ageing</p>
            <h2 className="mt-1 text-[15px] font-semibold text-gray-900">
              Pending applications by age band
            </h2>
          </div>
          <div className="h-72 min-w-0 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingChart} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#23252d" />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: HAIRLINE }} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,149,31,0.06)' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={54}>
                  {ageingChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card flush>
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-blue-600">Distribution</p>
            <h2 className="mt-1 text-[15px] font-semibold text-gray-900">Applications by stage</h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            {stageChart.length === 0 && <p className="text-[12.5px] text-gray-500">No pending applications.</p>}
            {stageChart.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] text-gray-700">{s.name}</span>
                  <span className="text-[11px] font-semibold tabular-nums text-gray-500">{s.value}</span>
                </div>
                <Meter
                  className="mt-1.5"
                  value={s.value}
                  max={maxStage}
                  tone={i === 0 ? 'pigment' : 'ink'}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card flush className="min-w-0">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-blue-600">Geography</p>
            <h2 className="mt-1 text-[15px] font-semibold text-gray-900">Region-wise pendency</h2>
          </div>
          <div className="h-72 min-w-0 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChart} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#23252d" />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: HAIRLINE }} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,149,31,0.06)' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Pending" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="Breached" fill={PIGMENT} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 border-t border-gray-100 px-5 py-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-3 rounded-[1px] bg-value" /> Pending
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-3 rounded-[1px] bg-accent" /> Breached
            </span>
          </div>
        </Card>

        <Card flush className="min-w-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="label text-pigment">Forecast</p>
              <h2 className="mt-1 text-[15px] font-semibold text-gray-900">
                Breach risk · next 30 days
              </h2>
            </div>
            <ArrowUpRight size={16} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-100">
            {predictive.length === 0 && (
              <p className="px-5 py-8 text-center text-[12.5px] text-gray-500">No at-risk applications.</p>
            )}
            {predictive.map((p) => {
              const overdue = p.daysRemaining < 0;
              const severe = overdue || p.risk === 'HIGH';
              return (
                <div key={p.applicationNumber} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-gray-900">{p.applicationNumber}</p>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500">
                      {p.institution} · {humanize(p.stage)}
                    </p>
                  </div>
                  <div className="w-20">
                    <Meter
                      value={overdue ? 100 : Math.max(6, 100 - p.daysRemaining * 3)}
                      tone={severe ? 'pigment' : 'muted'}
                    />
                  </div>
                  <div className="flex w-[104px] shrink-0 items-center justify-end gap-2">
                    <Badge
                      value={p.risk === 'BREACHED' ? 'CRITICAL' : p.risk === 'HIGH' ? 'WARNING' : 'INFO'}
                      marker={false}
                    />
                    <span className={`text-[11px] font-medium ${severe ? 'text-red-600' : 'text-gray-500'}`}>
                      {overdue ? `${Math.abs(p.daysRemaining)}d over` : `${p.daysRemaining}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
