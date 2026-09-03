import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '../common/Icon';
import ActionsApi from '../../services/actionsApi';
import { useToast } from '../../context/ToastContext';
import { buttonMotion } from '../../styles/motion';

export const DecisionDialog = ({ isOpen, onClose, action, onSuccess }) => {
  const [decision, setDecision] = useState(action?.decision || 'NEGOTIATE');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  if (!isOpen || !action) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific justification or reasoning for this decision.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await ActionsApi.recordActionDecision(action.id, {
        decision,
        reason: reason.trim()
      });
      toast(`Decision '${decision}' recorded successfully in ledger`, 'ok');
      if (onSuccess) onSuccess(res.action);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record decision');
    } finally {
      setSubmitting(false);
    }
  };

  const getDecisionSideEffect = () => {
    switch (decision) {
      case 'NEGOTIATE':
      case 'ESCALATE':
        return action.status === 'OPEN'
          ? 'ℹ️ This decision will automatically advance action status from OPEN → IN REVIEW.'
          : 'ℹ️ Keeps action in review with the logged decision.';
      case 'DISMISS':
        return '⚠️ This decision will automatically transition action status to DISMISSED.';
      case 'ACCEPT':
        return 'ℹ️ Logs decision acceptance. Review remains open until explicitly resolved.';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      <div
        className="modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose();
        }}
      >
        <motion.div
          className="card"
          style={{
            maxWidth: '540px',
            width: '100%',
            background: 'var(--bg-card, #18181B)',
            borderColor: 'var(--border-hairline, rgba(255, 255, 255, 0.12))',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            padding: '24px'
          }}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
        >
          <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon.pen width={18} height={18} color="var(--amber, #F59E0B)" />
                Record Human Decision
              </h3>
              <p className="text-mid small" style={{ margin: '4px 0 0 0' }}>
                {action.title}
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '4px' }}
            >
              <Icon.x width={16} height={16} />
            </button>
          </div>

          {error && (
            <div
              className="mb-16 p-12"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#FCA5A5',
                fontSize: '13px'
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-16">
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                Select Decision Type
              </label>
              <select
                className="input"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                disabled={submitting}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', color: '#FFF' }}
              >
                <option value="NEGOTIATE">NEGOTIATE — Request clause revision / redline</option>
                <option value="ESCALATE">ESCALATE — Flag to legal counsel / management</option>
                <option value="ACCEPT">ACCEPT — Acknowledge and accept current risk</option>
                <option value="DISMISS">DISMISS — Dismiss risk with documented rationale</option>
              </select>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#9CA3AF' }}>
                {getDecisionSideEffect()}
              </div>
            </div>

            <div className="mb-16">
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                Decision Reason / Rationale <span style={{ color: '#F87171' }}>*</span>
              </label>
              <textarea
                className="input"
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Explain the commercial or legal context for this decision..."
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#FFF',
                  resize: 'vertical'
                }}
              />
            </div>

            <div
              className="p-12 mb-16"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#9CA3AF'
              }}
            >
              🔒 <strong>Audit Invariant:</strong> Decisions are permanently recorded in the immutable append-only ledger and attributed to your user account.
            </div>

            <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={submitting || !reason.trim()}
                {...buttonMotion}
              >
                {submitting ? 'Recording Decision…' : 'Record Decision in Ledger'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DecisionDialog;
