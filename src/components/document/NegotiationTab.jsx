import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import SkeletonLoader from '../common/SkeletonLoader';
import { buttonMotion } from '../../styles/motion';

export const NegotiationTab = ({ doc }) => {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadNegotiation() {
      try {
        const res = await Api.get(`/api/ai/documents/${doc.id}/negotiation`);
        if (isMounted) setSuggestions(res.suggestions || []);
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to load negotiation suggestions', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadNegotiation();
    return () => {
      isMounted = false;
    };
  }, [doc.id, toast]);

  const copySuggestedText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast('Suggested clause copied to clipboard', 'ok');
  };

  if (loading) {
    return <SkeletonLoader.Card count={2} height="160px" />;
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="dot dot-gold" />
        Negotiation &amp; Risk Mitigation Assistant
      </div>

      {suggestions && suggestions.length === 0 ? (
        <EmptyState
          icon={<Icon.check />}
          title="No high-risk clauses flagged"
          sub="This document contains standard, balanced terms based on current analysis."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          {suggestions?.map((s, idx) => (
            <div key={idx} className={`neg-card risk-${s.risk}`} style={{ margin: 0 }}>
              <div className="flex-between mb-8">
                <strong style={{ color: 'var(--navy)', fontSize: '14.5px' }}>{s.issue}</strong>
                <span className={`badge ${s.risk === 'high' ? 'badge-danger' : 'badge-warn'}`}>
                  {s.risk?.toUpperCase()} RISK
                </span>
              </div>
              <blockquote style={{ fontStyle: 'italic', color: 'var(--charcoal)', background: 'var(--white)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                "{s.clause}"
              </blockquote>
              <p className="text-mid small mt-8">{s.recommendation}</p>
              <div
                className="neg-suggested flex-between mt-8"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--emerald-bg)',
                  borderColor: 'rgba(5, 150, 105, 0.2)'
                }}
              >
                <span>
                  <Icon.check /> <strong>Suggested:</strong> {s.suggestedText}
                </span>
                <motion.button
                  className="btn btn-ghost btn-sm"
                  onClick={() => copySuggestedText(s.suggestedText)}
                  style={{ marginLeft: '12px', flexShrink: 0 }}
                  {...buttonMotion}
                >
                  Copy
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NegotiationTab;
