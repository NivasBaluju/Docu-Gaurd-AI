import React from 'react';
import { DecisionBadge } from './ActionStatusBadge';
import { fmtDate } from '../../utils/formatters';

export const DecisionHistory = ({ decisions = [] }) => {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="p-16 text-center text-muted small" style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
        No decisions recorded in ledger yet.
      </div>
    );
  }

  return (
    <div className="decision-history-list flex flex-col gap-12">
      <div
        className="p-8 flex-between"
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '6px',
          fontSize: '11.5px',
          color: '#FCD34D'
        }}
      >
        <span>🔒 <strong>Append-Only Decision Ledger</strong></span>
        <span className="mono">{decisions.length} Historical {decisions.length === 1 ? 'Record' : 'Records'}</span>
      </div>

      {decisions.map((dec, idx) => {
        return (
          <div
            key={dec.id || idx}
            className="card"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              padding: '14px 16px',
              borderRadius: '8px'
            }}
          >
            <div className="flex-between mb-8" style={{ alignItems: 'center' }}>
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <span className="mono text-muted small" style={{ fontWeight: 600 }}>#{decisions.length - idx}</span>
                <DecisionBadge decision={dec.decision} size="small" />
              </div>
              <span className="mono text-muted" style={{ fontSize: '11px' }}>
                {fmtDate(dec.created_at)}
              </span>
            </div>

            <p style={{ margin: '6px 0 8px 0', fontSize: '13px', color: '#E4E4E7', lineHeight: 1.5 }}>
              "{dec.reason}"
            </p>

            <div className="text-muted" style={{ fontSize: '11.5px' }}>
              Decided by: <span style={{ color: '#D4D4D8' }}>{dec.decided_by_name || (dec.decided_by ? `User (${dec.decided_by.slice(0, 8)}…)` : 'Authenticated User')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DecisionHistory;
