import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, TrendingDown } from 'lucide-react';
import { api, apiError } from '../api/client';
import { Button, Field, PageHeader, Select, Skeleton } from '../components/ui';
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
        eyebrow="Planning"
        title={
          <>
            Capacity <em>simulation</em>
          </>
        }
        subtitle="Project the impact of additional officers on pendency and SLA breaches."
        actions={
          <Button icon={<ArrowLeft size={12} />} onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-[5px] border border-line bg-panel lg:col-span-1">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="label text-pigment">Inputs</p>
            <h2 className="mt-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">Parameters</h2>
          </div>
          <div className="space-y-5 px-5 py-5">
            <Field label="Region">
              <Select value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {humanize(r)}
                  </option>
                ))}
              </Select>
            </Field>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor="officers" className="label text-ink-2">
                  Additional officers
                </label>
                <span className="font-mono text-[26px] font-medium leading-none tracking-[-0.04em] text-value">
                  {String(additionalOfficers).padStart(2, '0')}
                </span>
              </div>
              <input
                id="officers"
                type="range"
                min={0}
                max={10}
                value={additionalOfficers}
                onChange={(e) => setAdditional(parseInt(e.target.value, 10))}
                className="w-full accent-[#ff951f]"
              />
              <div className="mt-1 flex justify-between label-sm text-muted">
                <span>0</span>
                <span>10</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              icon={<Play size={12} />}
              onClick={run}
              loading={loading}
            >
              {loading ? 'Running' : 'Run simulation'}
            </Button>

            <p className="border-t border-gray-100 pt-4 text-[10px] leading-relaxed text-muted">
              The model projects cases per officer and the resulting breach rate from current open
              volume and officer count.
            </p>
          </div>
        </section>

        <section className="rounded-[5px] border border-line bg-panel lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="label text-pigment">Projection</p>
            <h2 className="mt-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">Outcome</h2>
          </div>

          {loading ? (
            <div className="space-y-4 p-5">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </div>
          ) : !result ? (
            <div className="flex h-[24rem] flex-col items-center justify-center px-6 text-center">
              <p className="label text-muted">No run yet</p>
              <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-muted">
                Choose a region and officer count, then run the simulation to view projected
                outcomes.
              </p>
            </div>
          ) : (
            <div className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-3">
                <h3 className="text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">
                  {humanize(result.region)}
                </h3>
                <span className="label-sm text-muted">
                  +{result.additionalOfficers} officer(s)
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <Metric label="Open cases" value={result.openCases} />
                <Metric label="Officers now" value={result.currentOfficers} />
                <Metric label="Officers after" value={result.officersAfter} />
                <Metric label="Cases / officer now" value={result.casesPerOfficerNow} />
                <Metric label="Cases / officer after" value={result.casesPerOfficerAfter} />
                <Metric label="Current breach" value={`${result.breachRateNow}%`} />
              </div>

              <div className="mt-6 flex items-start gap-4 border-t border-gray-100 pt-5">
                <TrendingDown className="mt-0.5 shrink-0 text-pigment" size={18} />
                <div>
                  <p className="label text-pigment">Projected breach rate</p>
                  <p className="mt-1 font-mono text-[42px] font-medium leading-none tracking-[-0.06em] text-value">
                    {result.projectedBreachRate}%
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
                    A reduction of {result.projectedReductionPct}% from adding{' '}
                    {result.additionalOfficers} officer(s) to {humanize(result.region)}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-t border-gray-100 pt-3">
      <p className="label-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-[26px] font-medium leading-none tracking-[-0.04em] text-value">{value}</p>
    </div>
  );
}
