import React, { useState, useEffect } from 'react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';

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
        <span className="dot dot-gold" />
        Negotiation Assistant
      </div>

      {suggestions && suggestions.length === 0 ? (
        <EmptyState
          icon={<Icon.check />}
          title="No high-risk clauses flagged"
          sub="This document looks balanced based on our heuristic scan."
        />
      ) : (
        suggestions?.map((s, idx) => (
          <div key={idx} className={`neg-card risk-${s.risk}`}>
            <div className="flex-between mb-8">
              <strong>{s.issue}</strong>
              <span className={`badge ${s.risk === 'high' ? 'badge-danger' : 'badge-warn'}`}>
                {s.risk?.toUpperCase()} RISK
              </span>
            </div>
            <blockquote>"{s.clause}"</blockquote>
            <p className="text-mid small">{s.recommendation}</p>
            <div className="neg-suggested">
              <Icon.check /> Suggested: {s.suggestedText}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default NegotiationTab;
