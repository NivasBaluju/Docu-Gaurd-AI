import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import SkeletonLoader from '../common/SkeletonLoader';
import { buttonMotion, EASE_OUT } from '../../styles/motion';

export const IntelligenceTab = ({ doc, refreshTrigger }) => {
  const [intelData, setIntelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProvenanceId, setExpandedProvenanceId] = useState(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadIntelligence = async (showToast = false) => {
    if (!doc?.id) return;
    if (showToast) setRefreshing(true);
    try {
      const res = await Api.get(`/api/documents/${doc.id}/intelligence`);
      setIntelData(res);
      if (showToast) toast('Executive intelligence updated successfully', 'ok');
    } catch (err) {
      toast(err.message || 'Failed to load contract intelligence', 'error');
    } finally {
      setLoading(false);
      if (showToast) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIntelligence(false);
  }, [doc?.id, refreshTrigger]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await Api.post(`/api/documents/${doc.id}/intelligence/refresh`, {});
      setIntelData(res);
      toast('Contract intelligence re-synthesized', 'ok');
    } catch (err) {
      toast(err.message || 'Failed to refresh intelligence', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportBrief = () => {
    if (!intelData) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const docName = doc.original_name || doc.filename || 'Contract';
    
    let briefMd = `# EXECUTIVE CONTRACT INTELLIGENCE BRIEF\n`;
    briefMd += `**Document:** ${docName}\n`;
    briefMd += `**Health Score:** ${intelData.healthScore}/100\n`;
    briefMd += `**Date:** ${dateStr}\n\n`;
    briefMd += `## Executive Summary\n${intelData.executiveSummary}\n\n`;
    
    if (intelData.conflicts && intelData.conflicts.length > 0) {
      briefMd += `## Identified Contract Conflicts & Inconsistencies\n`;
      intelData.conflicts.forEach((c, idx) => {
        briefMd += `### ${idx + 1}. ${c.title}\n`;
        briefMd += `- **Type:** ${c.conflictType}\n`;
        briefMd += `- **Description:** ${c.description}\n`;
        briefMd += `- **Recommendation:** ${c.recommendation}\n`;
        briefMd += `- **Evidence:**\n`;
        c.evidence.forEach(e => {
          briefMd += `  * *${e.section}*: "${e.excerpt || e.identifiedValue}"\n`;
        });
        briefMd += `\n`;
      });
    }

    briefMd += `## Prioritized Action Plan\n`;
    intelData.actionPlan.forEach((act, idx) => {
      briefMd += `### Priority ${idx + 1}: ${act.title} (${act.priorityScore}/100 - ${act.category})\n`;
      briefMd += `- **Recommended Action:** ${act.intelligenceAssessment.recommendedAction}\n`;
      briefMd += `- **Why It Matters:** ${act.intelligenceAssessment.whyItMatters}\n`;
      briefMd += `- **Section:** ${act.documentEvidence.section}\n`;
      briefMd += `- **Contract Excerpt:** "${act.documentEvidence.excerpt}"\n`;
      briefMd += `- **Score Breakdown:** Clause (${act.priorityBreakdown.clauseSeverity}) + Negotiation (${act.priorityBreakdown.negotiationImbalance}) + Simulation (${act.priorityBreakdown.simulationExposure}) + Deadline (${act.priorityBreakdown.deadlineUrgency}) + Compliance (${act.priorityBreakdown.complianceHazard})\n\n`;
    });

    briefMd += `---\n*DocuGuard AI Executive Contract Intelligence Engine. ${intelData.disclaimer}*\n`;

    const blob = new Blob([briefMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DocuGuard_Intelligence_Brief_${docName.replace(/\.[^/.]+$/, '')}_${dateStr}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('Executive brief exported successfully', 'ok');
  };

  if (loading) {
    return (
      <div className="card">
        <SkeletonLoader.Text lines={2} width="320px" />
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <SkeletonLoader.Card count={3} height="140px" />
        </div>
        <div style={{ marginTop: '20px' }}>
          <SkeletonLoader.Card count={2} height="200px" />
        </div>
      </div>
    );
  }

  if (!intelData || !intelData.actionPlan) {
    return (
      <div className="card">
        <EmptyState
          icon={<Icon.brain width={40} height={40} />}
          title="No Intelligence Data Available"
          description="Analyze the document to generate unified contract risk prioritization and executive intelligence."
          actionText="Compute Intelligence"
          onAction={handleRefresh}
        />
      </div>
    );
  }

  const { healthScore, metrics, executiveSummary, conflicts, actionPlan } = intelData;

  // Filter actions based on active category & search query
  const filteredActions = actionPlan.filter((item) => {
    if (filterCategory === 'CRITICAL' && item.category !== 'CRITICAL') return false;
    if (filterCategory === 'IMPORTANT' && item.category !== 'IMPORTANT') return false;
    if (filterCategory === 'MONITORING' && item.category !== 'MONITORING') return false;
    if (filterCategory === 'HEALTHY' && item.category !== 'HEALTHY') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAction = item.intelligenceAssessment.recommendedAction.toLowerCase().includes(q);
      const matchSec = item.documentEvidence.section.toLowerCase().includes(q);
      const matchExcerpt = item.documentEvidence.excerpt.toLowerCase().includes(q);
      if (!matchTitle && !matchAction && !matchSec && !matchExcerpt) return false;
    }
    return true;
  });

  const getHealthBadge = (score) => {
    if (score >= 80) return { label: 'Strong Contract Health', class: 'badge-ok', color: 'var(--green)' };
    if (score >= 60) return { label: 'Moderate Exposure', class: 'badge-warn', color: 'var(--amber)' };
    return { label: 'Critical Risk Exposure', class: 'badge-danger', color: 'var(--red)' };
  };

  const healthBadge = getHealthBadge(healthScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Executive Intelligence Header & Overview Card */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="dot dot-gold" />
              <h2 className="card-title" style={{ margin: 0, fontSize: '18px' }}>
                Executive Contract Intelligence &amp; Action Center
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                Phase 6.4 Synthesis
              </span>
            </div>
            <p className="text-lo mt-4" style={{ fontSize: '13px', maxWidth: '720px', marginBottom: 0 }}>
              Cross-system synthesis combining clause findings, risk factors, deadlines, negotiation imbalance, and simulation contingency results into a unified, prioritized executive action plan.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <motion.button
              className="btn btn-royal btn-sm"
              onClick={() => navigate(`/document/${doc.id}/actions`)}
              title="Open human workflow action center"
              {...buttonMotion}
            >
              <Icon.zap width={14} height={14} /> Action Center
            </motion.button>

            <motion.button
              className="btn btn-outline btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Re-compute intelligence assessment"
              {...buttonMotion}
            >
              <Icon.trending width={14} height={14} /> {refreshing ? 'Evaluating…' : 'Re-Evaluate'}
            </motion.button>

            <motion.button
              className="btn btn-primary btn-sm"
              onClick={handleExportBrief}
              title="Download executive brief report"
              {...buttonMotion}
            >
              <Icon.download width={14} height={14} /> Export Brief
            </motion.button>
          </div>
        </div>

        {/* Health Score & Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {/* Health Score Meter */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.07) 100%)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: `3px solid ${healthBadge.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                boxShadow: `0 0 16px ${healthBadge.color}33`
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-hi)' }}>{healthScore}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-lo)', marginTop: '-3px' }}>/100</span>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-lo)' }}>
                Contract Health
              </div>
              <span className={`badge ${healthBadge.class} mt-4`} style={{ fontSize: '11px' }}>
                {healthBadge.label}
              </span>
            </div>
          </div>

          {/* Critical Items */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              cursor: 'pointer'
            }}
            onClick={() => setFilterCategory('CRITICAL')}
          >
            <div style={{ fontSize: '11px', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
              🔴 Critical Actions
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-hi)', marginTop: '4px' }}>
              {metrics.criticalCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-lo)', marginTop: '2px' }}>
              Requires immediate legal review / renegotiation
            </div>
          </div>

          {/* Important Items */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              cursor: 'pointer'
            }}
            onClick={() => setFilterCategory('IMPORTANT')}
          >
            <div style={{ fontSize: '11px', color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
              🟠 Important Obligations
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-hi)', marginTop: '4px' }}>
              {metrics.importantCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-lo)', marginTop: '2px' }}>
              Moderate risk or upcoming schedule commitments
            </div>
          </div>

          {/* Monitoring Items */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              cursor: 'pointer'
            }}
            onClick={() => setFilterCategory('MONITORING')}
          >
            <div style={{ fontSize: '11px', color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
              🟡 Monitoring Items
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-hi)', marginTop: '4px' }}>
              {metrics.monitoringCount}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-lo)', marginTop: '2px' }}>
              Standard operational tracking points
            </div>
          </div>
        </div>

        {/* Executive Summary Narrative */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px 18px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderLeft: '4px solid var(--gold)',
            borderTop: '1px solid var(--border-color)',
            borderRight: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px' }}>📑</span>
            <strong style={{ fontSize: '13px', color: 'var(--gold)' }}>Executive Contract Narrative</strong>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-mid)', lineHeight: '1.6', margin: 0 }}>
            {executiveSummary}
          </p>
        </div>
      </div>

      {/* 2. Potential Contract Conflicts & Inconsistencies Callout */}
      {conflicts && conflicts.length > 0 && (
        <div
          className="card"
          style={{
            background: 'rgba(245, 158, 11, 0.04)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            padding: '18px 20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <strong style={{ fontSize: '14px', color: 'var(--amber)' }}>
                Potential Contract Inconsistencies &amp; Contradictions Detected ({conflicts.length})
              </strong>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
              Automated Analysis Notice
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {conflicts.map((conf) => (
              <div
                key={conf.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-hi)' }}>{conf.title}</span>
                  <span className="badge badge-warn" style={{ fontSize: '10px' }}>{conf.conflictType}</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-mid)', marginBottom: '10px' }}>
                  {conf.description}
                </p>

                {/* Evidence side-by-side comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  {conf.evidence.map((ev, eIdx) => (
                    <div
                      key={eIdx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px dashed rgba(255, 255, 255, 0.15)',
                        fontSize: '12px'
                      }}
                    >
                      <strong style={{ color: 'var(--text-hi)', display: 'block', marginBottom: '3px' }}>
                        {ev.section}
                      </strong>
                      <span className="text-lo" style={{ fontStyle: 'italic' }}>
                        "{ev.excerpt || ev.identifiedValue}"
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--amber)' }}>
                  <strong>Recommendation:</strong> {conf.recommendation}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-lo)', fontStyle: 'italic', marginTop: '10px' }}>
            * {AUTOMATED_ANALYSIS_DISCLAIMER_TEXT}
          </div>
        </div>
      )}

      {/* 3. Prioritized Action Center */}
      <div className="card">
        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All Actions (${actionPlan.length})` },
              { id: 'CRITICAL', label: `Critical (${metrics.criticalCount})`, color: 'var(--red)' },
              { id: 'IMPORTANT', label: `Important (${metrics.importantCount})`, color: 'var(--amber)' },
              { id: 'MONITORING', label: `Monitoring (${metrics.monitoringCount})`, color: '#60A5FA' },
              { id: 'HEALTHY', label: `Healthy (${metrics.healthyCount})`, color: 'var(--green)' }
            ].map((cat) => {
              const isActive = filterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    fontSize: '12px',
                    padding: '4px 12px',
                    borderColor: isActive ? undefined : 'var(--border-color)'
                  }}
                  onClick={() => setFilterCategory(cat.id)}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              placeholder="Search actions or clauses…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 30px',
                fontSize: '12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-hi)'
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '7px', opacity: 0.5, fontSize: '12px' }}>
              🔍
            </span>
          </div>
        </div>

        {/* Action Items List */}
        {filteredActions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p className="text-lo small">No prioritized action items matching current filter criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredActions.map((action, idx) => {
              const isCrit = action.category === 'CRITICAL';
              const isImp = action.category === 'IMPORTANT';
              const isProvExpanded = expandedProvenanceId === action.actionId;
              const isEvidenceExpanded = expandedEvidenceId === action.actionId;

              const borderAccent = isCrit
                ? 'rgba(239, 68, 68, 0.4)'
                : isImp
                ? 'rgba(245, 158, 11, 0.3)'
                : 'var(--border-color)';

              return (
                <motion.div
                  key={action.actionId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  style={{
                    borderRadius: '8px',
                    border: `1px solid ${borderAccent}`,
                    background: isCrit
                      ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.03) 0%, rgba(0, 0, 0, 0.2) 100%)'
                      : 'rgba(255, 255, 255, 0.02)',
                    padding: '18px 20px',
                    position: 'relative'
                  }}
                >
                  {/* Action Item Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isCrit ? 'var(--red)' : isImp ? 'var(--amber)' : 'var(--blue)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-hi)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {action.title}
                          <span
                            className={`badge ${
                              isCrit ? 'badge-danger' : isImp ? 'badge-warn' : 'badge-neutral'
                            }`}
                            style={{ fontSize: '10px' }}
                          >
                            {action.category}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                            {action.intelligenceAssessment.actionCategory}
                          </span>
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--text-lo)', marginTop: '2px' }}>
                          Target: <strong>{action.documentEvidence.section}</strong> ({action.documentEvidence.clauseType})
                        </div>
                      </div>
                    </div>

                    {/* Priority Score & Provenance Trigger */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: isCrit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isCrit ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`
                        }}
                      >
                        <span style={{ fontSize: '11px', color: 'var(--text-lo)' }}>Priority:</span>
                        <strong style={{ fontSize: '14px', color: isCrit ? 'var(--red)' : 'var(--text-hi)' }}>
                          {action.priorityScore}/100
                        </strong>
                      </div>

                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => setExpandedProvenanceId(isProvExpanded ? null : action.actionId)}
                        title="View deterministic calculation and provenance trail"
                      >
                        <Icon.target width={12} height={12} /> {isProvExpanded ? 'Hide Score Logic' : 'Why is this Priority ' + action.priorityScore + '?'}
                      </button>
                    </div>
                  </div>

                  {/* Provenance Calculation Breakdown (Expandable) */}
                  <AnimatePresence>
                    {isProvExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          overflow: 'hidden',
                          marginTop: '12px',
                          padding: '12px 16px',
                          borderRadius: '6px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '8px' }}>
                          🧬 Deterministic Score Formulation &amp; Audit Trail
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px' }}>
                          <div>
                            <span className="text-lo">Clause Severity:</span>{' '}
                            <strong>+{action.priorityBreakdown.clauseSeverity} pts</strong>
                          </div>
                          <div>
                            <span className="text-lo">Negotiation Imbalance:</span>{' '}
                            <strong>+{action.priorityBreakdown.negotiationImbalance} pts</strong>
                          </div>
                          <div>
                            <span className="text-lo">Simulation Exposure:</span>{' '}
                            <strong>+{action.priorityBreakdown.simulationExposure} pts</strong>
                          </div>
                          <div>
                            <span className="text-lo">Deadline Urgency:</span>{' '}
                            <strong>+{action.priorityBreakdown.deadlineUrgency} pts</strong>
                          </div>
                          <div>
                            <span className="text-lo">Compliance Hazard:</span>{' '}
                            <strong>+{action.priorityBreakdown.complianceHazard} pts</strong>
                          </div>
                        </div>

                        {/* Provenance Record IDs */}
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', fontSize: '11px', color: 'var(--text-lo)' }}>
                          <div>
                            <strong>Provenance Trail:</strong> Clause IDs: [
                            {action.provenance.clauseIds.length ? action.provenance.clauseIds.join(', ') : 'None'}
                            ] · Risk Factor IDs: [
                            {action.provenance.riskFactorIds.length ? action.provenance.riskFactorIds.join(', ') : 'None'}
                            ] · Simulation IDs: [
                            {action.provenance.simulationIds.length ? action.provenance.simulationIds.join(', ') : 'None'}
                            ] · Deadline IDs: [
                            {action.provenance.deadlineIds.length ? action.provenance.deadlineIds.join(', ') : 'None'}
                            ]
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cross-Feature Intelligence Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#93C5FD'
                      }}
                    >
                      Clause: {action.intelligenceAssessment.crossFeatureInsights.clauseFinding}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        color: '#D8B4FE'
                      }}
                    >
                      Negotiation: {action.intelligenceAssessment.crossFeatureInsights.negotiationPosture}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#FCA5A5'
                      }}
                    >
                      Simulation: {action.intelligenceAssessment.crossFeatureInsights.simulationImpact}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        color: '#FCD34D'
                      }}
                    >
                      Timing: {action.intelligenceAssessment.crossFeatureInsights.deadlineImpact}
                    </span>
                  </div>

                  {/* Recommendation & Why it Matters Box */}
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: isCrit ? 'var(--red)' : 'var(--gold)', fontSize: '14px', marginTop: '1px' }}>👉</span>
                      <div>
                        <strong style={{ fontSize: '13px', color: 'var(--text-hi)' }}>Recommended Action:</strong>{' '}
                        <span style={{ fontSize: '13px', color: 'var(--text-hi)' }}>
                          {action.intelligenceAssessment.recommendedAction}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: 'var(--text-lo)', fontSize: '14px', marginTop: '1px' }}>💡</span>
                      <div>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-lo)' }}>Why It Matters:</strong>{' '}
                        <span style={{ fontSize: '12.5px', color: 'var(--text-mid)' }}>
                          {action.intelligenceAssessment.whyItMatters}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fact vs. AI Separation Section (Toggle) */}
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '11.5px', padding: '3px 10px' }}
                        onClick={() => setExpandedEvidenceId(isEvidenceExpanded ? null : action.actionId)}
                      >
                        📄 {isEvidenceExpanded ? 'Hide Contract Text Evidence' : 'Inspect Contract Text Evidence'}
                      </button>

                      {/* Fast Navigation Quick Links */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => navigate(`/document/${doc.id}/negotiation`)}
                          title="Open in AI Negotiation Redliner"
                        >
                          <Icon.pen width={11} height={11} /> Redline
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => navigate(`/document/${doc.id}/simulation`)}
                          title="Test What-If Scenario in Simulation"
                        >
                          <Icon.trending width={11} height={11} /> Simulate
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => navigate(`/document/${doc.id}/clauses`)}
                          title="View in Clauses Breakdown"
                        >
                          <Icon.scales width={11} height={11} /> Clause
                        </button>
                      </div>
                    </div>

                    {/* Expandable Document Evidence Box */}
                    <AnimatePresence>
                      {isEvidenceExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{
                            overflow: 'hidden',
                            marginTop: '10px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '12px'
                          }}
                        >
                          {/* Sub-card 1: Immutable Document Facts */}
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: '6px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px' }}>🔒</span>
                              <strong style={{ fontSize: '12px', color: 'var(--text-hi)' }}>
                                Immutable Document Evidence (Fact)
                              </strong>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--gold)', marginBottom: '4px' }}>
                              {action.documentEvidence.section}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-mid)', fontStyle: 'italic', lineHeight: '1.5' }}>
                              "{action.documentEvidence.excerpt}"
                            </div>
                            {action.documentEvidence.risks && action.documentEvidence.risks.length > 0 && (
                              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--red)' }}>
                                <strong>Detected Risk:</strong> {action.documentEvidence.risks[0]}
                              </div>
                            )}
                          </div>

                          {/* Sub-card 2: DocuGuard AI Assessment */}
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: '6px',
                              background: 'rgba(37, 99, 235, 0.05)',
                              border: '1px solid rgba(37, 99, 235, 0.2)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px' }}>🧠</span>
                              <strong style={{ fontSize: '12px', color: '#60A5FA' }}>
                                DocuGuard AI Assessment (Strategy)
                              </strong>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-hi)', marginBottom: '6px' }}>
                              {action.intelligenceAssessment.recommendedAction}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-lo)' }}>
                              * {action.intelligenceAssessment.disclaimer}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const AUTOMATED_ANALYSIS_DISCLAIMER_TEXT =
  'Potential inconsistency detected by automated analysis — not a legal conclusion.';

export default IntelligenceTab;
