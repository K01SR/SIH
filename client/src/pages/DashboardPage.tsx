import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle, Clock, FileCheck2, FileText, Layers } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Spinner, StatCard, Badge } from '../components/ui';
import { humanize } from '../utils';
import type { DashboardSummary } from '../types';

const BUCKET_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [regions, setRegions] = useState<Record<string, { total: number; breached: number }>>({});
  const [predictive, setPredictive] = useState<
    { applicationNumber: string; institution: string; daysRemaining: number; risk: string; stage: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return null;

  const isInstitution = user?.role === 'INSTITUTION';
  const ageingChart = data.ageing.buckets.map((b) => ({ name: b.label, count: b.count, color: BUCKET_COLORS[b.color] }));
  const stageChart = Object.entries(data.ageing.byStage).map(([name, value]) => ({ name: humanize(name), value }));
  const regionChart = Object.entries(regions).map(([name, v]) => ({ name: humanize(name), Pending: v.total, Breached: v.breached }));

  return (
    <div>
      <PageHeader
        title={`${humanize(user?.role ?? '')} Dashboard`}
        subtitle="Real-time pendency, SLA status and workload overview"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Applications" value={data.summary.total} icon={<Layers size={30} />} />
        <StatCard label="Pending" value={data.summary.pending} accent="text-amber-600" icon={<Clock size={30} />} />
        <StatCard label="SLA Breached" value={data.summary.breached} accent="text-red-600" icon={<AlertTriangle size={30} />} sub="Requires immediate attention" />
        <StatCard label="Approved" value={data.summary.approved} accent="text-green-600" icon={<FileCheck2 size={30} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">Ageing Analysis (pending applications)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {ageingChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700">Applications by Stage</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageChart} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {stageChart.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {!isInstitution && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700">Region-wise Pendency</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="Pending" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Breached" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={16} /> Predictive Pendency — Breach Risk (next 30 days)
            </h3>
            <div className="mt-3 space-y-2">
              {predictive.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No at-risk applications</p>}
              {predictive.map((p) => (
                <div key={p.applicationNumber} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.applicationNumber}</p>
                    <p className="text-xs text-slate-500">{p.institution} · {humanize(p.stage)}</p>
                  </div>
                  <div className="text-right">
                    <Badge value={p.risk === 'BREACHED' ? 'CRITICAL' : p.risk === 'HIGH' ? 'WARNING' : 'INFO'} />
                    <p className="mt-1 text-xs text-slate-500">
                      {p.daysRemaining < 0 ? `${Math.abs(p.daysRemaining)}d overdue` : `${p.daysRemaining}d left`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
