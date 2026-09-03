import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PortfolioOperationsApi } from '../../services/portfolioOperationsApi';
import { useToast } from '../../context/ToastContext';
import SkeletonLoader from '../common/SkeletonLoader';
import EmptyState from '../common/EmptyState';

/**
 * Phase 8.0 — Bulk Operation History Panel
 * Displays paginated auditable execution receipts for past bulk operations.
 */

const STATUS_COLORS = {
  COMPLETED:  { bg: 'rgba(16,185,129,0.1)',  color: '#10B981', border: 'rgba(16,185,129,0.25)' },
  PREVIEWED:  { bg: 'rgba(99,102,241,0.1)',  color: '#818CF8', border: 'rgba(99,102,241,0.25)' },
  EXECUTING:  { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  FAILED:     { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
};

const OP_LABELS = {
  BULK_ASSIGN:     '👤 Bulk Assignment',
  BULK_DEADLINE:   '📅 Bulk Deadline',
  BULK_TRANSITION: '🔄 Bulk Transition',
};

export const BulkOperationHistoryPanel = () => {
  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const { toast } = useToast();

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await PortfolioOperationsApi.getBatchHistory({ page, limit: pagination.limit });
      setBatches(res.batches || []);
      setPagination(p => ({ ...p, ...res.pagination }));
    } catch (err) {
      toast(err.message || 'Failed to load batch history', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => { fetchHistory(1); }, []);

  const statusChip = (status) => {
    const style = STATUS_COLORS[status] || STATUS_COLORS.PREVIEWED;
    return (
      <span style={{
        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
        background: style.bg, color: style.color, border: `1px solid ${style.border}`,
      }}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>
          📋 Batch Operation History
        </div>
        <SkeletonLoader.Card count={3} height="56px" />
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFF' }}>
            📋 Batch Operation History
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            Auditable execution receipts for all bulk operations
          </p>
        </div>
        <button
          onClick={() => fetchHistory(pagination.page)}
          style={{
            padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          icon="layers"
          title="No batch operations yet"
          desc="Bulk operations you execute from the Attention Queue will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AnimatePresence>
            {batches.map(batch => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                style={{
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {/* Batch row */}
                <button
                  onClick={() => setExpandedId(expandedId === batch.id ? null : batch.id)}
                  style={{
                    width: '100%', padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '2px' }}>
                        {OP_LABELS[batch.operation_type] || batch.operation_type}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(batch.created_at).toLocaleString()} · Mode: {batch.mode}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right', fontSize: '12px' }}>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>{batch.executed_count}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}> / {batch.requested_count} executed</span>
                    </div>
                    {statusChip(batch.status)}
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      {expandedId === batch.id ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* Expanded receipt */}
                <AnimatePresence>
                  {expandedId === batch.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        padding: '12px 18px 16px',
                        borderTop: '1px solid rgba(255,255,255,0.07)',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                      }}>
                        {[
                          ['Batch ID',   batch.id?.slice(0, 18) + '…'],
                          ['Mode',       batch.mode],
                          ['Requested',  batch.requested_count],
                          ['Eligible',   batch.eligible_count],
                          ['Executed',   batch.executed_count],
                          ['Blocked',    batch.blocked_count],
                          ['Completed',  batch.completed_at ? new Date(batch.completed_at).toLocaleString() : '—'],
                          ['Status',     batch.status],
                        ].map(([k, v]) => (
                          <div key={k} style={{ fontSize: '12px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{k}: </span>
                            <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{String(v)}</span>
                          </div>
                        ))}
                        {batch.blocked_json?.length > 0 && (
                          <div style={{ gridColumn: '1/-1', marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#F87171', fontWeight: 600, marginBottom: '4px' }}>
                              Blocked ({batch.blocked_count}):
                            </div>
                            {batch.blocked_json.map((b, i) => (
                              <div key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
                                {b.actionId?.slice(0,8)}… — {b.reason}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {pagination.total} total batch{pagination.total !== 1 ? 'es' : ''}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchHistory(pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchHistory(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkOperationHistoryPanel;
