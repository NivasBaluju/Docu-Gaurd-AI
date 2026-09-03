import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '../common/Icon';
import ActionsApi from '../../services/actionsApi';
import { useToast } from '../../context/ToastContext';
import { buttonMotion } from '../../styles/motion';

export const DueDateDialog = ({ isOpen, onClose, action, onSuccess }) => {
  const initialDate = action?.due_date ? new Date(action.due_date).toISOString().split('T')[0] : '';
  const [dateVal, setDateVal] = useState(initialDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  if (!isOpen || !action) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payloadDueDate = dateVal ? new Date(`${dateVal}T23:59:59Z`).toISOString() : null;

    try {
      const res = await ActionsApi.updateActionDueDate(action.id, {
        dueDate: payloadDueDate
      });
      toast(payloadDueDate ? 'Due date updated' : 'Due date cleared', 'ok');
      if (onSuccess) onSuccess(res.action);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update due date');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearDate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await ActionsApi.updateActionDueDate(action.id, {
        dueDate: null
      });
      toast('Due date removed', 'ok');
      if (onSuccess) onSuccess(res.action);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to remove due date');
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
            maxWidth: '460px',
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
                <Icon.calendar width={18} height={18} />
                Manage Action Due Date
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
                Resolution Target Date
              </label>
              <input
                type="date"
                className="input"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                disabled={submitting}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', color: '#FFF' }}
              />
            </div>

            <div className="flex-between gap-8 mt-24">
              <div>
                {action.due_date && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={handleClearDate}
                    disabled={submitting}
                  >
                    Clear Due Date
                  </button>
                )}
              </div>
              <div className="flex gap-8">
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
                  disabled={submitting}
                  {...buttonMotion}
                >
                  {submitting ? 'Saving…' : 'Set Due Date'}
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DueDateDialog;
