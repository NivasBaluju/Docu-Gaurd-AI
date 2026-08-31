import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';

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
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot" />
        AI Privacy Mode — PII Detection
      </div>

      {items && items.length === 0 ? (
        <EmptyState
          icon={<Icon.shield />}
          title="No PII detected"
          sub="No Aadhaar, PAN, passport, phone, email or card numbers found."
        />
      ) : (
        <>
          {items?.map((i, idx) => (
            <div key={idx} className="pii-item">
              <span>{i.label}</span>
              <span className="mono">{i.value}</span>
            </div>
          ))}

          <button
            className="btn btn-danger mt-16"
            onClick={handleRedact}
            disabled={redacting}
          >
            <Icon.lock /> {redacting ? 'Redacting…' : 'Redact All PII'}
          </button>
        </>
      )}

      {redactedData && (
        <div id="redactResult" className="mt-16">
          <div
            className="card"
            style={{ background: 'var(--emerald-bg)', borderColor: 'rgba(5,150,105,0.2)' }}
          >
            <div className="card-title">
              <span className="dot dot-emerald" />
              Redacted Output ({redactedData.itemsFound} items masked)
            </div>
            <div className="doc-text">{redactedData.redacted}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PiiTab;
