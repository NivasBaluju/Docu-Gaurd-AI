import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '../common/Icon';
import ActionsApi from '../../services/actionsApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { buttonMotion } from '../../styles/motion';

export const OwnerDialog = ({ isOpen, onClose, action, onSuccess }) => {
  const { user } = useAuth();
  const [selectedOwnerId, setSelectedOwnerId] = useState(action?.owner_id || '');
  const [customOwnerId, setCustomOwnerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  if (!isOpen || !action) return null;

  const handleAssignSelf = () => {
    if (user?.id) {
      setSelectedOwnerId(user.id);
      setCustomOwnerId('');
    }
  };

  const handleUnassign = () => {
    setSelectedOwnerId('');
    setCustomOwnerId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const ownerIdToSet = customOwnerId.trim() || selectedOwnerId || null;

    try {
      const res = await ActionsApi.updateActionOwner(action.id, {
        ownerId: ownerIdToSet
      });
      toast(ownerIdToSet ? 'Action owner assigned' : 'Action owner unassigned', 'ok');
      if (onSuccess) onSuccess(res.action);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update owner');
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
            maxWidth: '500px',
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
                <Icon.user width={18} height={18} />
                Manage Action Ownership
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
                Current Owner
              </label>
              <div
                className="p-12 mb-12 flex-between"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px' }}>
                    {action.owner_name || action.owner_email || (action.owner_id ? `User ${action.owner_id.slice(0, 8)}…` : 'Unassigned')}
                  </strong>
                  {action.owner_email && (
                    <div className="text-mid small">{action.owner_email}</div>
                  )}
                </div>
                {action.owner_id && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={handleUnassign}
                    disabled={submitting}
                  >
                    Unassign
                  </button>
                )}
              </div>

              <div className="flex gap-8 mb-16">
                {user && user.id !== action.owner_id && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleAssignSelf}
                    disabled={submitting}
                    style={{ flex: 1 }}
                  >
                    <Icon.user width={14} height={14} /> Assign to Myself ({user.name || user.email})
                  </button>
                )}
              </div>

              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                Or Assign by User ID (UUID)
              </label>
              <input
                type="text"
                className="input"
                value={customOwnerId}
                onChange={(e) => {
                  setCustomOwnerId(e.target.value);
                  setSelectedOwnerId('');
                }}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                disabled={submitting}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', color: '#FFF' }}
              />
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
                disabled={submitting}
                {...buttonMotion}
              >
                {submitting ? 'Updating Owner…' : 'Save Ownership'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OwnerDialog;
