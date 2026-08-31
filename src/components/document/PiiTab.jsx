import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import SkeletonLoader from '../common/SkeletonLoader';
import { buttonMotion, EASE_OUT } from '../../styles/motion';

export const PiiTab = ({ doc }) => {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redactedData, setRedactedData] = useState(null);
  const [redacting, setRedacting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadPii() {
      try {
        const res = await Api.get(`/api/ai/documents/${doc.id}/pii`);
        if (isMounted) setItems(res.items || []);
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to detect PII', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPii();
    return () => {
      isMounted = false;
    };
  }, [doc.id, toast]);

  const handleRedact = async () => {
    setRedacting(true);
    try {
      const res = await Api.post(`/api/ai/documents/${doc.id}/redact`, {});
      setRedactedData(res);
      toast(`${res.itemsFound} PII items redacted`, 'ok');
    } catch (err) {
      toast(err.message || 'Redaction failed', 'error');
    } finally {
      setRedacting(false);
    }
  };

  if (loading) {
    return <SkeletonLoader.Card count={2} height="140px" />;
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot" />
        AI Privacy Mode — PII Detection &amp; Masking
      </div>

      {items && items.length === 0 ? (
        <EmptyState
          icon={<Icon.shield />}
          title="No sensitive PII detected"
          sub="No Aadhaar, PAN, passport, phone, email or card numbers found."
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {items?.map((i, idx) => (
              <div key={idx} className="pii-item" style={{ margin: 0 }}>
                <span style={{ fontWeight: '500' }}>{i.label}</span>
                <span className="mono" style={{ background: 'var(--white)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  {i.value}
                </span>
              </div>
            ))}
          </div>

          <motion.button
            className="btn btn-danger mt-16"
            onClick={handleRedact}
            disabled={redacting}
            {...buttonMotion}
          >
            <Icon.lock /> {redacting ? 'Masking sensitive entities…' : 'Redact All PII'}
          </motion.button>
        </>
      )}

      <AnimatePresence>
        {redactedData && (
          <motion.div
            id="redactResult"
            className="mt-16"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <div
              className="card"
              style={{ background: 'var(--emerald-bg)', borderColor: 'rgba(5,150,105,0.2)' }}
            >
              <div className="card-title">
                <span className="dot dot-emerald" />
                Redacted Output ({redactedData.itemsFound} items masked)
              </div>
              <div className="doc-text" style={{ fontSize: '13.5px', lineHeight: '1.7' }}>{redactedData.redacted}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PiiTab;
