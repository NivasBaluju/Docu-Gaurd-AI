import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '../common/Icon';
import ActionsApi from '../../services/actionsApi';
import { useToast } from '../../context/ToastContext';
import { buttonMotion } from '../../styles/motion';

export const DismissalDialog = ({ isOpen, onClose, action, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  if (!isOpen || !action) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A dismissal reason is strictly required to dismiss this workflow action.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await ActionsApi.updateActionStatus(action.id, {
        status: 'DISMISSED',
        reason: reason.trim()
      });
      toast('Action dismissed with documented rationale', 'info');
      if (onSuccess) onSuccess(res.action);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to dismiss action');
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
                <Icon.x width={18} height={18} color="#9CA3AF" />
                Dismiss Workflow Action
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
                Dismissal Reason / Commercial Context <span style={{ color: '#F87171' }}>*</span>
              </label>
              <textarea
                className="input"
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Explain why this action is being dismissed (e.g., 'Risk is acceptable under existing enterprise master agreement terms')..."
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
              ℹ️ Dismissed actions are not deleted. They remain searchable, inspectable in history, and can be reconsidered at any time.
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
                className="btn btn-sm"
                disabled={submitting || !reason.trim()}
                style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF' }}
                {...buttonMotion}
              >
                {submitting ? 'Dismissing…' : 'Confirm Dismissal'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DismissalDialog;
