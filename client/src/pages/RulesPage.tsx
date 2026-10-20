import { useEffect, useState } from 'react';
import { Save, Power, History, Settings2 } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Card, PageHeader, Spinner, Badge } from '../components/ui';
import { formatDateTime, humanize } from '../utils';
import type { RuleConfig } from '../types';

const RULE_TYPES = [
  'APH_ROUTING_MATRIX',
  'SLA_TIMELINES',
  'ESCALATION_MATRIX',
  'NOTIFICATION_RULES',
  'AGEING_THRESHOLDS',
];

export function RulesPage() {
  const { push } = useToast();
  const [active, setActive] = useState<Record<string, unknown>>({});
  const [versions, setVersions] = useState<RuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('SLA_TIMELINES');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/rules/active'), api.get('/rules')])
      .then(([a, v]) => {
        setActive(a.data.data);
        setVersions(v.data.data);
        setDraft(JSON.stringify(a.data.data[selected] ?? {}, null, 2));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active[selected]) setDraft(JSON.stringify(active[selected], null, 2));
  }, [selected, active]);

  const saveNewVersion = async (activate: boolean) => {
    setSaving(true);
    try {
      const parsed = JSON.parse(draft);
      await api.post('/rules', {
        type: selected,
        name: `${humanize(selected)} v${(versions.filter((v) => v.type === selected)[0]?.version ?? 0) + 1}`,
        config: parsed,
        activate,
      });
      push(activate ? 'New rule version saved and activated' : 'New rule version saved (draft)');
      load();
    } catch (err) {
      if (err instanceof SyntaxError) push('Invalid JSON: ' + err.message, 'error');
      else push(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const activateVersion = async (id: string) => {
    try {
      await api.post(`/rules/${id}/activate`);
      push('Rule version activated');
      load();
    } catch (err) {
      push(apiError(err), 'error');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Rules Configuration"
        subtitle="APH routing matrix, SLA timelines, escalation & notification rules — configurable as data, versioned, no redeploy"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {RULE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${selected === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
          >
            {humanize(t)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Settings2 size={16} /> {humanize(selected)} — Active Configuration (editable)
            </h3>
            <span className="text-xs text-slate-400">Edit JSON and save a new version</span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            rows={20}
            className="w-full rounded-lg border border-slate-300 bg-slate-900 px-4 py-3 font-mono text-xs text-green-300 outline-none focus:border-blue-500"
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => setDraft(JSON.stringify(active[selected] ?? {}, null, 2))}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={() => saveNewVersion(false)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
            >
              <Save size={15} /> Save as Draft Version
            </button>
            <button
              onClick={() => saveNewVersion(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Power size={15} /> Save &amp; Activate
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <History size={16} /> Version History — {humanize(selected)}
          </h3>
          <div className="max-h-[32rem] space-y-2 overflow-y-auto">
            {versions
              .filter((v) => v.type === selected)
              .map((v) => (
                <div key={v.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">v{v.version}</p>
                    {v.isActive ? <Badge value="VALID" /> : <span className="text-xs text-slate-400">inactive</span>}
                  </div>
                  <p className="text-xs text-slate-500">{v.name}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(v.createdAt)}</p>
                  {!v.isActive && (
                    <button
                      onClick={() => activateVersion(v.id)}
                      className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Activate this version
                    </button>
                  )}
                </div>
              ))}
            {versions.filter((v) => v.type === selected).length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No saved versions — showing built-in defaults</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
