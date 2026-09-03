import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '../common/Icon';
import ActionsApi from '../../services/actionsApi';
import { useToast } from '../../context/ToastContext';
import { buttonMotion } from '../../styles/motion';

export const ResolutionDialog = ({ isOpen, onClose, action, onSuccess }) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  if (!isOpen || !action) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setError('Resolution notes are strictly required to resolve this workflow action.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await ActionsApi.updateActionStatus(action.id, {
        status: 'RESOLVED',
        resolutionNotes: resolutionNotes.trim()
      });
      toast('Action successfully marked as RESOLVED', 'ok');
      if (onSuccess) onSuccess(res.action);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to resolve action');
    } finally {
      setSubmitting(false);
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
            borderColor: 'rgba(74, 222, 128, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            padding: '24px'
          }}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
        >
          <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#4ADE80' }}>
                <Icon.checkCircle width={20} height={20} />
                Resolve Workflow Action
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
                Resolution Documentation / Notes <span style={{ color: '#F87171' }}>*</span>
              </label>
              <textarea
                className="input"
                rows={4}
                value={resolutionNotes}
                onChange={(e) => {
                  setResolutionNotes(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Describe how this issue or clause risk was resolved (e.g., 'Renegotiated 60-day mutual notice clause and countersigned amendment with counterparty')..."
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
                background: 'rgba(74, 222, 128, 0.05)',
                border: '1px solid rgba(74, 222, 128, 0.2)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#86EFAC'
              }}
            >
              ✓ <strong>State Transition Invariant:</strong> Setting this action to RESOLVED stamps the current timestamp and commits resolution notes to the permanent audit trail.
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
                disabled={submitting || !resolutionNotes.trim()}
                style={{ background: '#16A34A', borderColor: '#22C55E' }}
                {...buttonMotion}
              >
                {submitting ? 'Resolving Action…' : 'Confirm Resolution'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ResolutionDialog;
