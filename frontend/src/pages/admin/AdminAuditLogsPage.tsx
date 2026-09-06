import React, { useEffect, useState } from 'react';
import { getAuditLogsApi } from '../../api/admin';
import type { AuditLogResponse } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { formatDateTime } from '../../utils/formatters';
import { ChevronDown, ChevronUp, User, Clock } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAuditLogsApi({ limit: 50 });
      setLogs(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-navy tracking-tight">Audit & Security Logs</h1>
        <p className="text-xs text-muted">Immutable trace of all operational schedule modifications, seat reallocations, and cancellations</p>
      </div>

      <div className="bg-surface rounded-card border border-brandBorder shadow-card overflow-hidden">
        {loading ? (
          <LoadingState message="Fetching immutable audit logs..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLogs} />
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted">No audit logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-brandBorder/60">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-surface-soft/40 transition-colors">
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy px-2 py-0.5 rounded bg-primary/10 text-primary uppercase text-[10px] tracking-wider">
                          {log.action}
                        </span>
                        <span className="font-semibold text-navy">
                          {log.entity_type} {log.entity_id ? `(#${log.entity_id.substring(0, 8)})` : ''}
                        </span>
                      </div>
                      <p className="text-brandText text-xs">{log.reason || 'Operational action executed'}</p>
                    </div>

                    <div className="flex items-center gap-4 text-muted shrink-0 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>{log.actor_id ? log.actor_id.substring(0, 8) : 'System Worker'}</span>
                      </div>
                      <button className="p-1 hover:text-navy text-muted">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON State Changes */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-brandBorder/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in">
                      <div className="p-3 bg-surface-soft rounded-lg space-y-1">
                        <span className="font-bold text-navy block text-[11px] uppercase tracking-wider">
                          State Before Action
                        </span>
                        <pre className="text-[11px] font-mono text-muted bg-surface p-2.5 rounded border border-brandBorder/60 overflow-x-auto">
                          {log.state_before ? JSON.stringify(log.state_before, null, 2) : 'None / Initial creation'}
                        </pre>
                      </div>

                      <div className="p-3 bg-surface-soft rounded-lg space-y-1">
                        <span className="font-bold text-navy block text-[11px] uppercase tracking-wider">
                          State After Action
                        </span>
                        <pre className="text-[11px] font-mono text-navy bg-surface p-2.5 rounded border border-brandBorder/60 overflow-x-auto">
                          {log.state_after ? JSON.stringify(log.state_after, null, 2) : 'No state delta recorded'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
