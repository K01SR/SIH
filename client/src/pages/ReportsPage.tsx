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
import { AlertTriangle } from 'lucide-react';
import { api, apiError } from '../api/client';
import { Badge, Card, PageHeader, Spinner } from '../components/ui';
import { formatDate, humanize } from '../utils';

interface RegionPerf {
  [region: string]: { total: number; breached: number; completed: number; breachRate: number };
}

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

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div>
        <PageHeader title="Consolidated Reports" subtitle="Pendency, compliance, document validity, overdue cases and Region-wise performance" />
        <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <AlertTriangle className="text-red-500" size={32} />
          <p className="text-sm text-slate-600">{error}</p>
          <button onClick={load} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const perfData = Object.entries(regionPerf).map(([region, v]) => ({
    name: humanize(region),
    Total: v.total,
    Completed: v.completed,
    Breached: v.breached,
  }));

  return (
    <div>
      <PageHeader title="Consolidated Reports" subtitle="Pendency, compliance, document validity, overdue cases and Region-wise performance" />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['performance', 'overdue', 'compliance'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
          >
            {t === 'performance' ? 'Region Performance' : t === 'overdue' ? 'Overdue Cases' : 'Compliance'}
          </button>
        ))}
      </div>

      {tab === 'performance' && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Region-wise Processing Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="Total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Completed" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Breached" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(regionPerf).map(([region, v]) => (
              <div key={region} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{humanize(region)}</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{v.total}</p>
                <p className="text-xs text-slate-400">Breach rate: {v.breachRate}%</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'overdue' && overdue && (
        <div className="grid gap-4 md:grid-cols-3">
          <ReportList title="SLA-breached applications" count={overdue.breachedApps.length} items={overdue.breachedApps as { applicationNumber: string; institution?: { name: string } }[]} render={(x) => `${x.applicationNumber} · ${x.institution?.name}`} />
          <ReportList title="Overdue undertakings" count={overdue.overdueUndertakings.length} items={overdue.overdueUndertakings as { title: string; dueDate: string }[]} render={(x) => `${x.title} (due ${formatDate(x.dueDate)})`} />
          <ReportList title="Expired documents" count={overdue.expiredDocs.length} items={overdue.expiredDocs as { title: string; institution?: { name: string } }[]} render={(x) => `${x.title} · ${x.institution?.name}`} />
        </div>
      )}

      {tab === 'compliance' && compliance && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Undertakings by Status</h3>
            <div className="space-y-2">
              {compliance.undertakings.map((u) => (
                <div key={u.status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <Badge value={u.status} />
                  <span className="font-semibold text-slate-800">{u._count._all}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Documents by Status</h3>
            <div className="space-y-2">
              {compliance.documents.map((d) => (
                <div key={d.status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <Badge value={d.status} />
                  <span className="font-semibold text-slate-800">{d._count._all}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ReportList<T>({ title, count, items, render }: { title: string; count: number; items: T[]; render: (x: T) => string }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">{count}</span>
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {items.length === 0 && <p className="py-4 text-center text-sm text-slate-400">None</p>}
        {items.map((x, i) => (
          <p key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{render(x)}</p>
        ))}
      </div>
    </Card>
  );
}
