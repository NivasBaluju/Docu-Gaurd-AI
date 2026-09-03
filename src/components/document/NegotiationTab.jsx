import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import SkeletonLoader from '../common/SkeletonLoader';
import { buttonMotion, EASE_OUT } from '../../styles/motion';

const MODES = [
  { id: 'balanced', label: 'Balanced', icon: '🟢', desc: 'Fair, mutual compromise' },
  { id: 'protective', label: 'Protective', icon: '🛡️', desc: 'Risk-minimizing & capped liability' },
  { id: 'aggressive', label: 'Aggressive', icon: '🔥', desc: 'Strong counter-positions & strict cure' },
  { id: 'collaborative', label: 'Collaborative', icon: '🤝', desc: 'Win-win dialogue & dispute escalation' }
];

export const NegotiationTab = ({ doc }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [selectedClauseId, setSelectedClauseId] = useState(null);
  const [activeMode, setActiveMode] = useState('balanced');
  const [negotiationResult, setNegotiationResult] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [acceptedClauses, setAcceptedClauses] = useState({});
  const { toast } = useToast();

  // 1. Fetch negotiation opportunities from document
  useEffect(() => {
    let isMounted = true;
    async function loadOpportunities() {
      try {
        const res = await Api.get(`/api/documents/${doc.id}/negotiation-suggestions`);
        if (isMounted) {
          const opps = res.opportunities || [];
          setOpportunities(opps);
          if (opps.length > 0) {
            setSelectedClauseId(opps[0].clauseId);
          }
        }
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to load negotiation suggestions', 'error');
      } finally {
        if (isMounted) setLoadingList(false);
      }
    }
    loadOpportunities();
    return () => {
      isMounted = false;
    };
  }, [doc.id, toast]);

  // 2. Trigger negotiation generation when selected clause or mode changes
  useEffect(() => {
    if (!selectedClauseId) return;

    let isMounted = true;
    async function fetchNegotiation() {
      setGenerating(true);
      try {
        const selectedOpp = opportunities.find((o) => o.clauseId === selectedClauseId);
        const res = await Api.post(`/api/documents/${doc.id}/negotiate`, {
          clauseId: selectedClauseId,
          clauseType: selectedOpp?.clauseType,
          mode: activeMode
        });
        if (isMounted) {
          setNegotiationResult(res);
        }
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to generate negotiation redline', 'error');
      } finally {
        if (isMounted) setGenerating(false);
      }
    }
    fetchNegotiation();
    return () => {
      isMounted = false;
    };
  }, [doc.id, selectedClauseId, activeMode, opportunities, toast]);

  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast('Negotiated revision copied to clipboard', 'ok');
  };

  const handleAccept = (clauseId) => {
    setAcceptedClauses((prev) => ({ ...prev, [clauseId]: true }));
    toast('Clause revision marked as accepted for execution draft', 'ok');
  };

  if (loadingList) {
    return <SkeletonLoader.Card count={2} height="180px" />;
  }

  if (opportunities.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<Icon.check />}
          title="No high-risk clauses flagged for negotiation"
          sub="This contract currently contains standard, commercially balanced terms."
        />
      </div>
    );
  }

  const selectedOpp = opportunities.find((o) => o.clauseId === selectedClauseId) || opportunities[0];
  const isAccepted = acceptedClauses[selectedClauseId];

  return (
    <div className="card">
      <div className="card-header-flex">
        <div className="card-title">
          <span className="dot dot-gold" />
          AI Contract Negotiation &amp; Redline Copilot
        </div>
        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
          Word-Level Redline Engine
        </span>
      </div>

      <p className="text-lo mt-4 mb-16" style={{ fontSize: '13px' }}>
        Select a contract clause to inspect legal imbalances, choose your strategic negotiation posture, and generate evidence-grounded redlines.
      </p>

      {/* 1. Negotiation Posture Mode Selector */}
      <div className="mb-20">
        <div className="text-lo" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Strategic Negotiation Posture
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {MODES.map((m) => {
            const isActive = activeMode === m.id;
            return (
              <motion.button
                key={m.id}
                type="button"
                onClick={() => setActiveMode(m.id)}
                style={{
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: isActive ? '1px solid var(--royal)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
                {...buttonMotion}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: isActive ? 'var(--hi)' : 'var(--mid)', fontSize: '13px' }}>
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </div>
                <div className="text-lo" style={{ fontSize: '11px', marginTop: '4px' }}>
                  {m.desc}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="divider" />

      {/* 2. Clause Selector Pills */}
      <div className="mb-20">
        <div className="text-lo" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Identified Clauses ({opportunities.length})
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {opportunities.map((opp) => {
            const isSelected = opp.clauseId === selectedClauseId;
            const accepted = acceptedClauses[opp.clauseId];
            return (
              <motion.button
                key={opp.clauseId}
                type="button"
                onClick={() => setSelectedClauseId(opp.clauseId)}
                style={{
                  background: isSelected ? 'var(--royal)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#fff' : 'var(--mid)',
                  border: isSelected ? '1px solid var(--royal)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
                {...buttonMotion}
              >
                {accepted && <span>✓</span>}
                <span>{opp.clauseType}</span>
                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.08)'
                  }}
                >
                  {opp.riskLevel}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. Negotiation Analysis & Redline Card */}
      {generating ? (
        <div style={{ padding: '36px 0', textAlign: 'center' }}>
          <SkeletonLoader.Card count={1} height="200px" />
          <div className="text-lo mt-12" style={{ fontSize: '12px' }}>
            Applying {activeMode} negotiation posture and generating word-level redline…
          </div>
        </div>
      ) : negotiationResult ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Card A: Document Evidence (Immutable Fact) */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📄 Found in Document ({negotiationResult.documentEvidence?.section || 'Contract'})
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                Immutable Document Fact
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12.5px',
                color: 'var(--mid)',
                lineHeight: '1.6',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '12px 14px',
                borderRadius: '6px',
                borderLeft: '3px solid var(--gold)'
              }}
            >
              "{negotiationResult.documentEvidence?.clause}"
            </div>
          </div>

          {/* Card B: AI Strategic Recommendation */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.04)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 600, color: 'var(--royal)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💡 AI Strategic Recommendation ({activeMode.toUpperCase()} MODE)
              </span>
              <span className={`badge ${negotiationResult.aiRecommendation?.riskSeverity === 'HIGH' ? 'badge-danger' : 'badge-warn'}`} style={{ fontSize: '10.5px' }}>
                {negotiationResult.aiRecommendation?.riskSeverity} RISK
              </span>
            </div>

            <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
              <div>
                <strong style={{ color: 'var(--hi)' }}>Identified Imbalance: </strong>
                <span style={{ color: 'var(--mid)' }}>{negotiationResult.aiRecommendation?.identifiedImbalance}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--hi)' }}>Negotiation Strategy: </strong>
                <span style={{ color: 'var(--mid)' }}>{negotiationResult.aiRecommendation?.strategy}</span>
              </div>
              {negotiationResult.aiRecommendation?.objectives && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {negotiationResult.aiRecommendation.objectives.map((obj, oIdx) => (
                    <span key={oIdx} className="source-tag" style={{ fontSize: '10.5px' }}>
                      🎯 {obj.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card C: Word-Level Visual Redline */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--hi)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✍️ Proposed Redline Diff
              </span>
              {negotiationResult.redline?.summary && (
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>+{negotiationResult.redline.summary.additions} added</span>
                  <span className="text-lo">·</span>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>-{negotiationResult.redline.summary.deletions} removed</span>
                </div>
              )}
            </div>

            {/* Word-Level Rendered Redline */}
            <div
              style={{
                lineHeight: '1.7',
                fontSize: '13.5px',
                padding: '14px 16px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              {negotiationResult.redline?.operations?.map((op, opIdx) => {
                if (op.type === 'delete') {
                  return (
                    <del
                      key={opIdx}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                        textDecoration: 'line-through',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        margin: '0 1px'
                      }}
                    >
                      {op.text}
                    </del>
                  );
                }
                if (op.type === 'insert') {
                  return (
                    <ins
                      key={opIdx}
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#6ee7b7',
                        textDecoration: 'none',
                        fontWeight: 600,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        margin: '0 1px'
                      }}
                    >
                      {op.text}
                    </ins>
                  );
                }
                return <span key={opIdx} style={{ color: 'var(--hi)' }}>{op.text}</span>;
              })}
            </div>

            {/* Redline Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <motion.button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleCopyText(negotiationResult.aiRecommendation?.suggestedRevision)}
                {...buttonMotion}
              >
                <Icon.copy /> Copy Revised Text
              </motion.button>
              <motion.button
                type="button"
                className={`btn btn-sm ${isAccepted ? 'btn-ghost' : 'btn-primary'}`}
                onClick={() => handleAccept(selectedClauseId)}
                disabled={isAccepted}
                {...buttonMotion}
              >
                <Icon.check /> {isAccepted ? 'Accepted in Draft' : 'Accept Revision'}
              </motion.button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NegotiationTab;
