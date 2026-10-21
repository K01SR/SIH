import { useEffect, useState } from 'react';
import { ScrollText, AlertTriangle } from 'lucide-react';
import { api, apiError } from '../api/client';
import { Badge, Card, PageHeader, Spinner, EmptyState } from '../components/ui';
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
      <PageHeader title="Digital Audit Trail" subtitle="Immutable record of application movement, observations, actions and decisions" />

      <Card className="mb-4">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action or entity type"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </Card>

      {loading ? (
        <Spinner />
      ) : error ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <AlertTriangle className="text-red-500" size={32} />
          <p className="text-sm text-slate-600">{error}</p>
          <button onClick={load} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Retry
          </button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState message="No audit entries" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{l.user?.fullName ?? 'System'}</p>
                    <p className="text-xs text-slate-400">{l.user ? humanize(l.user.role) : 'automated'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <ScrollText size={13} className="text-slate-400" />
                      {humanize(l.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={l.entityType} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500">{l.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
