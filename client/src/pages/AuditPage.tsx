import { useEffect, useState } from 'react';
import { ScrollText, AlertTriangle, Search } from 'lucide-react';
import { api, apiError } from '../api/client';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  TableSkeleton,
} from '../components/ui';
import { formatDateTime, humanize } from '../utils';
import type { AuditLog } from '../types';

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/audit', { params: { limit: '300' } })
      .then((res) => setLogs(res.data.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter(
    (l) =>
      !filter ||
      l.action.toLowerCase().includes(filter.toLowerCase()) ||
      l.entityType.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        eyebrow="Trace"
        title={
          <>
            Digital <em>audit trail</em>
          </>
        }
        subtitle="Immutable record of application movement, observations, actions and decisions."
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by action or entity type"
            className="pl-9"
            aria-label="Filter audit trail"
          />
        </div>
        <p className="label-sm text-muted">
          {String(filtered.length).padStart(3, '0')} of {String(logs.length).padStart(3, '0')} entries
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={9} cols={5} />
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle size={24} />}
          message="Unable to load audit trail"
          hint={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ScrollText size={24} />} message="No audit entries" />
      ) : (
        <div className="border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-ground-tint">
                  {['When', 'Actor', 'Action', 'Entity', 'Details'].map((h) => (
                    <th key={h} className="label px-4 py-3 text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 last:border-b-0 hover:bg-white/5">
                    <td className="whitespace-nowrap px-4 py-3 text-[10px] text-muted">
                      {formatDateTime(l.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-ink">{l.user?.fullName ?? 'System'}</p>
                      <p className="label-sm text-muted">{l.user ? humanize(l.user.role) : 'automated'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-2">
                        <ScrollText size={11} className="text-muted" />
                        {humanize(l.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={l.entityType} marker={false} />
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[10px] text-muted">{l.details ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
