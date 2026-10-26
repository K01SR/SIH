import { useEffect, useState } from 'react';
import { Save, Power, History, Settings2 } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Badge, Button, PageHeader, Skeleton, Tabs } from '../components/ui';
import { formatDateTime, humanize } from '../utils';
import type { RuleConfig } from '../types';

const RULE_TYPES = [
  'APH_ROUTING_MATRIX',
  'SLA_TIMELINES',
  'ESCALATION_MATRIX',
  'NOTIFICATION_RULES',
  'AGEING_THRESHOLDS',
] as const;

type RuleType = (typeof RULE_TYPES)[number];

export function RulesPage() {
  const { push } = useToast();
  const [active, setActive] = useState<Record<string, unknown>>({});
  const [versions, setVersions] = useState<RuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RuleType>('SLA_TIMELINES');
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
      .catch((err) => push(apiError(err), 'error'))
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

  if (loading) {
    return (
      <div>
        <div className="mb-8 border-b border-gray-100 pb-5">
          <Skeleton className="h-2 w-24" />
          <Skeleton className="mt-3 h-10 w-80" />
        </div>
        <Skeleton className="mb-4 h-8 w-full max-w-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[30rem] lg:col-span-2" />
          <Skeleton className="h-[30rem]" />
        </div>
      </div>
    );
  }

  const activeVersions = versions.filter((v) => v.type === selected);

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title={
          <>
            Rules <em>configuration</em>
          </>
        }
        subtitle="APH routing matrix, SLA timelines, escalation and notification rules — configurable as data, versioned, without a redeploy."
      />

      <Tabs
        className="mb-6"
        value={selected}
        onChange={setSelected}
        items={RULE_TYPES.map((t) => ({ value: t, label: humanize(t) }))}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-[5px] border border-line bg-panel lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
            <div>
              <p className="label text-pigment">Editable</p>
              <h2 className="mt-1 flex items-center gap-2 text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">
                <Settings2 size={16} className="text-muted" /> {humanize(selected)}
              </h2>
            </div>
            <span className="label-sm text-muted">Active configuration</span>
          </div>
          <div className="p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              rows={20}
              aria-label={`${humanize(selected)} JSON configuration`}
              className="focus-ring w-full resize-y border border-line bg-ground px-4 py-3 font-mono text-[11.5px] leading-relaxed text-ink-muted outline-none"
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button onClick={() => setDraft(JSON.stringify(active[selected] ?? {}, null, 2))}>
                Reset
              </Button>
              <Button icon={<Save size={12} />} onClick={() => saveNewVersion(false)} disabled={saving}>
                Save draft version
              </Button>
              <Button
                variant="primary"
                icon={<Power size={12} />}
                onClick={() => saveNewVersion(true)}
                loading={saving}
              >
                Save &amp; activate
              </Button>
            </div>
          </div>
        </section>

        <aside className="rounded-[5px] border border-line bg-panel">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="label text-pigment">History</p>
            <h2 className="mt-1 flex items-center gap-2 text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">
              <History size={15} className="text-muted" /> Versions
            </h2>
          </div>
          <div className="max-h-[34rem] overflow-y-auto">
            {activeVersions.map((v) => (
              <div key={v.id} className="border-b border-gray-100 px-5 py-3.5 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[18px] font-medium leading-none tracking-[-0.04em] text-value">v{v.version}</p>
                  {v.isActive ? <Badge value="VALID" /> : <span className="label-sm text-muted">inactive</span>}
                </div>
                <p className="mt-1 text-[10.5px] text-ink-2">{v.name}</p>
                <p className="label-sm text-muted">{formatDateTime(v.createdAt)}</p>
                {!v.isActive && (
                  <Button size="sm" className="mt-2 w-full" onClick={() => activateVersion(v.id)}>
                    Activate this version
                  </Button>
                )}
              </div>
            ))}
            {activeVersions.length === 0 && (
              <p className="px-5 py-8 text-center label-sm text-muted">
                No saved versions — showing built-in defaults
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
