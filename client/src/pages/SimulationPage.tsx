import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, TrendingDown } from 'lucide-react';
import { api, apiError } from '../api/client';
import { Card, PageHeader, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { humanize } from '../utils';

interface SimulationResult {
  region: string;
  openCases: number;
  breached: number;
  currentOfficers: number;
  additionalOfficers: number;
  officersAfter: number;
  casesPerOfficerNow: number;
  casesPerOfficerAfter: number;
  breachRateNow: number;
  projectedBreachRate: number;
  projectedReductionPct: number;
}

const REGIONS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'NORTH_EAST'];

/**
 * Simulation mode: what-if capacity planning. Projects the effect of adding
 * officers to a region on per-officer caseload and breach rate.
 */
export function SimulationPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [region, setRegion] = useState('WEST');
  const [additionalOfficers, setAdditional] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications/analytics/simulate', {
        params: { region, additionalOfficers },
      });
      setResult(res.data.data);
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Capacity Simulation"
        subtitle="Project the impact of additional officers on pendency and SLA breaches"
        actions={
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="font-semibold text-slate-800">Parameters</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {humanize(r)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Additional Officers: {additionalOfficers}
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={additionalOfficers}
                onChange={(e) => setAdditional(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
            <button
              onClick={run}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Play size={16} /> {loading ? 'Running…' : 'Run Simulation'}
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {loading ? (
            <Spinner />
          ) : !result ? (
            <div className="flex h-full items-center justify-center py-14 text-sm text-slate-400">
              Run the simulation to view projected outcomes.
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-slate-800">
                Projected outcome — {humanize(result.region)}
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Metric label="Open Cases" value={result.openCases} />
                <Metric label="Officers Now" value={result.currentOfficers} />
                <Metric label="Officers After" value={result.officersAfter} />
                <Metric label="Cases/Officer Now" value={result.casesPerOfficerNow} />
                <Metric label="Cases/Officer After" value={result.casesPerOfficerAfter} />
                <Metric label="Current Breach %" value={`${result.breachRateNow}%`} />
              </div>
              <div className="mt-5 flex items-center gap-4 rounded-lg bg-green-50 p-4">
                <TrendingDown className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Projected breach rate: {result.projectedBreachRate}%
                  </p>
                  <p className="text-xs text-green-700">
                    A reduction of {result.projectedReductionPct}% from adding {result.additionalOfficers}{' '}
                    officer(s) to {humanize(result.region)}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
