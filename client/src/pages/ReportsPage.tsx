import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { api, apiError } from '../api/client';
import {
  Badge,
  Button,
  EmptyState,
  Meter,
  PageHeader,
  Skeleton,
  Tabs,
} from '../components/ui';
import { formatDate, humanize } from '../utils';

interface RegionPerf {
  [region: string]: { total: number; breached: number; completed: number; breachRate: number };
}

const INK = '#edcd8c';
const PIGMENT = '#ff951f';
const MUTED = '#707684';
const HAIRLINE = '#303139';
const AXIS_TICK = { fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', fill: '#c9ced8' };
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

export function ReportsPage() {
  const [regionPerf, setRegionPerf] = useState<RegionPerf>({});
  const [overdue, setOverdue] = useState<{ breachedApps: unknown[]; overdueUndertakings: unknown[]; expiredDocs: unknown[] } | null>(null);
  const [compliance, setCompliance] = useState<{ undertakings: { status: string; _count: { _all: number } }[]; documents: { status: string; _count: { _all: number } }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'performance' | 'overdue' | 'compliance'>('performance');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([api.get('/reports/region-performance'), api.get('/reports/overdue'), api.get('/reports/compliance')])
      .then(([r, o, c]) => {
        setRegionPerf(r.data.data);
        setOverdue(o.data.data);
        setCompliance(c.data.data);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-2 w-20" />
          <Skeleton className="mt-3 h-10 w-80" />
        </div>
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          eyebrow="Analysis"
          title={
            <>
              Consolidated <em>reports</em>
            </>
          }
          subtitle="Pendency, compliance, document validity and region-wise performance."
        />
        <EmptyState
          icon={<AlertTriangle size={24} />}
          message="Unable to load reports"
          hint={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  const perfData = Object.entries(regionPerf).map(([region, v]) => ({
    name: humanize(region),
    Total: v.total,
    Completed: v.completed,
    Breached: v.breached,
  }));
  const maxCompliance = Math.max(
    1,
    ...(compliance?.undertakings.map((u) => u._count._all) ?? []),
    ...(compliance?.documents.map((d) => d._count._all) ?? [])
  );

  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title={
          <>
            Consolidated <em>reports</em>
          </>
        }
        subtitle="Pendency, compliance, document validity, overdue cases and region-wise performance."
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'performance', label: 'Region performance' },
          { value: 'overdue', label: 'Overdue cases' },
          { value: 'compliance', label: 'Compliance' },
        ]}
      />

      {tab === 'performance' && (
        <div className="overflow-hidden rounded-[5px] border border-line bg-panel">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-blue-600">Throughput</p>
            <h2 className="mt-1 text-[15px] font-semibold text-gray-900">
              Region-wise processing performance
            </h2>
          </div>
          <div className="h-80 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="1 4" vertical={false} stroke="#23252d" />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={{ stroke: HAIRLINE }} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,149,31,0.06)' }} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Total" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="Completed" fill={MUTED} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="Breached" fill={PIGMENT} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-5 border-t border-gray-100 px-5 py-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-3 rounded-[1px] bg-value" /> Total
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-3 rounded-[1px] bg-[#707684]" /> Completed
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-3 rounded-[1px] bg-accent" /> Breached
            </span>
          </div>
          <div className="grid border-t border-gray-100 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(regionPerf).map(([region, v]) => (
              <div key={region} className="border-b border-r border-gray-100 px-5 py-4 last:border-r-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="label text-muted">{humanize(region)}</p>
                  <p className="text-[20px] font-bold leading-none tracking-tight text-gray-900">{v.total}</p>
                </div>
                <p className="mt-1 label-sm text-muted">
                  {v.completed} completed · {v.breached} breached
                </p>
                <Meter
                  className="mt-2"
                  value={v.breachRate}
                  tone={v.breachRate > 20 ? 'pigment' : 'ink'}
                />
                <p className="mt-1 label-sm text-muted">Breach rate {v.breachRate}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'overdue' && overdue && (
        <div className="grid gap-4 md:grid-cols-3">
          <ReportList
            title="SLA-breached applications"
            count={overdue.breachedApps.length}
            items={overdue.breachedApps as { applicationNumber: string; institution?: { name: string } }[]}
            render={(x) => `${x.applicationNumber} · ${x.institution?.name}`}
          />
          <ReportList
            title="Overdue undertakings"
            count={overdue.overdueUndertakings.length}
            items={overdue.overdueUndertakings as { title: string; dueDate: string }[]}
            render={(x) => `${x.title} (due ${formatDate(x.dueDate)})`}
          />
          <ReportList
            title="Expired documents"
            count={overdue.expiredDocs.length}
            items={overdue.expiredDocs as { title: string; institution?: { name: string } }[]}
            render={(x) => `${x.title} · ${x.institution?.name}`}
          />
        </div>
      )}

      {tab === 'compliance' && compliance && (
        <div className="grid gap-4 md:grid-cols-2">
          <CompliancePanel title="Undertakings by status" rows={compliance.undertakings} max={maxCompliance} />
          <CompliancePanel title="Documents by status" rows={compliance.documents} max={maxCompliance} />
        </div>
      )}
    </div>
  );
}

function ReportList<T>({ title, count, items, render }: { title: string; count: number; items: T[]; render: (x: T) => string }) {
  return (
    <div className="overflow-hidden rounded-[5px] border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h3 className="text-[11px] font-medium text-ink">{title}</h3>
        <span className="label-sm text-pigment">[{String(count).padStart(2, '0')}]</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 && <p className="px-4 py-6 text-center label-sm text-muted">None</p>}
        {items.map((x, i) => (
          <p key={i} className="border-b border-gray-100 px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-2 last:border-b-0">
            {render(x)}
          </p>
        ))}
      </div>
    </div>
  );
}

function CompliancePanel({
  title,
  rows,
  max,
}: {
  title: string;
  rows: { status: string; _count: { _all: number } }[];
  max: number;
}) {
  return (
    <div className="overflow-hidden rounded-[5px] border border-line bg-panel">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-[11px] font-medium text-ink">{title}</h3>
      </div>
      <div className="space-y-3 px-4 py-4">
        {rows.length === 0 && <p className="label-sm text-muted">No records</p>}
        {rows.map((r) => (
          <div key={r.status}>
            <div className="flex items-center justify-between gap-3">
              <Badge value={r.status} />
              <span className="font-mono text-[18px] font-medium leading-none tracking-[-0.04em] text-value">
                {String(r._count._all).padStart(2, '0')}
              </span>
            </div>
            <Meter className="mt-1.5" value={r._count._all} max={max} tone="ink" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2">
        <BarChart3 size={11} className="text-muted" />
        <p className="label-sm text-muted">Counts are live from the register</p>
      </div>
    </div>
  );
}
