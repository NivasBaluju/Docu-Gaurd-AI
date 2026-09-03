import React from 'react';
import Icon from '../common/Icon';

export const ActionStatusBadge = ({ status, size = 'normal' }) => {
  const isSmall = size === 'small';
  const style = isSmall ? { fontSize: '11px', padding: '2px 7px' } : {};

  switch (status) {
    case 'OPEN':
      return (
        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60A5FA' }} />
          OPEN
        </span>
      );
    case 'IN_REVIEW':
      return (
        <span className="badge badge-warn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FB923C' }} />
          IN REVIEW
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="badge badge-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <Icon.check width={12} height={12} strokeWidth={2.5} />
          RESOLVED
        </span>
      );
    case 'DISMISSED':
      return (
        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <Icon.x width={11} height={11} strokeWidth={2} />
          DISMISSED
        </span>
      );
    default:
      return <span className="badge badge-neutral" style={style}>{status || 'UNKNOWN'}</span>;
  }
};

export const DecisionBadge = ({ decision, size = 'normal' }) => {
  if (!decision) return null;
  const isSmall = size === 'small';
  const style = isSmall ? { fontSize: '11px', padding: '2px 7px' } : {};

  switch (decision) {
    case 'ACCEPT':
      return (
        <span className="badge badge-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <Icon.check width={11} height={11} />
          DECISION: ACCEPT
        </span>
      );
    case 'NEGOTIATE':
      return (
        <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <Icon.pen width={11} height={11} />
          DECISION: NEGOTIATE
        </span>
      );
    case 'ESCALATE':
      return (
        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <Icon.alert width={11} height={11} />
          DECISION: ESCALATE
        </span>
      );
    case 'DISMISS':
      return (
        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ...style }}>
          <Icon.x width={11} height={11} />
          DECISION: DISMISS
        </span>
      );
    default:
      return <span className="badge badge-neutral" style={style}>DECISION: {decision}</span>;
  }
};

export const CategoryBadge = ({ category, size = 'normal' }) => {
  const isSmall = size === 'small';
  const style = isSmall ? { fontSize: '11px', padding: '2px 7px' } : {};

  switch (category) {
    case 'CRITICAL':
      return <span className="badge badge-danger" style={style}>🔴 CRITICAL</span>;
    case 'IMPORTANT':
      return <span className="badge badge-warn" style={style}>🟠 IMPORTANT</span>;
    case 'MONITORING':
      return <span className="badge badge-info" style={style}>🟡 MONITORING</span>;
    case 'HEALTHY':
      return <span className="badge badge-ok" style={style}>🟢 HEALTHY</span>;
    default:
      return <span className="badge badge-neutral" style={style}>{category || 'GENERAL'}</span>;
  }
};

export const DueDateBadge = ({ dueDate }) => {
  if (!dueDate) {
    return <span className="text-muted small" style={{ fontSize: '11.5px' }}>No Due Date</span>;
  }

  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="badge badge-danger" style={{ fontSize: '11px', padding: '2px 6px' }}>
        <Icon.clock width={11} height={11} /> Overdue by {Math.abs(diffDays)}d
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="badge badge-danger" style={{ fontSize: '11px', padding: '2px 6px' }}>
        <Icon.clock width={11} height={11} /> Due Today
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span className="badge badge-warn" style={{ fontSize: '11px', padding: '2px 6px' }}>
        <Icon.clock width={11} height={11} /> Due in {diffDays}d
      </span>
    );
  }
  return (
    <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '2px 6px' }}>
      <Icon.clock width={11} height={11} /> Due in {diffDays}d
    </span>
  );
};

export default {
  ActionStatusBadge,
  DecisionBadge,
  CategoryBadge,
  DueDateBadge
};
