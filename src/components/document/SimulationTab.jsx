import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Icon from '../common/Icon';
import EmptyState from '../common/EmptyState';
import SkeletonLoader from '../common/SkeletonLoader';
import { buttonMotion, EASE_OUT } from '../../styles/motion';

const SUGGESTED_SCENARIOS = [
  { id: 'payment', icon: '💰', title: 'Payment Delay', query: 'What happens if the client pays the invoice 45 days late?' },
  { id: 'termination', icon: '🚪', title: 'Unilateral Exit', query: 'What happens if either party terminates immediately without prior notice?' },
  { id: 'confidentiality', icon: '🔒', title: 'Data Leak', query: 'What is the contractual exposure if confidential technical information is leaked?' },
  { id: 'dispute', icon: '⚖️', title: 'Deliverable Dispute', query: 'What happens if a dispute arises regarding deliverable acceptance?' }
];

export const SimulationTab = ({ doc }) => {
  const [scenarioInput, setScenarioInput] = useState('');
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [history, setHistory] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { toast } = useToast();

  // 1. Fetch simulation history from Node gateway (PostgreSQL)
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      try {
        const res = await Api.get(`/api/documents/${doc.id}/simulations`);
        if (isMounted) {
          setHistory(res.simulations || []);
        }
      } catch (err) {
        if (isMounted) console.warn('Simulation history fetch notice:', err.message);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [doc.id]);

  const handleSimulate = async (scenarioText) => {
    const query = (scenarioText || scenarioInput || '').trim();
    if (!query) {
      toast('Please enter a hypothetical scenario to simulate', 'error');
      return;
    }

    setSimulating(true);
    try {
      const res = await Api.post(`/api/documents/${doc.id}/simulate`, { scenario: query });
      setActiveSimulation(res);
      setScenarioInput('');
      
      // Prepend to history
      if (res.grounded !== false) {
        setHistory((prev) => [
          {
            id: res.simulationId || Date.now().toString(),
            scenario: query,
            grounded: true,
            documentEvidence: res.documentEvidence,
            simulationAnalysis: res.simulationAnalysis,
            riskLevel: res.simulationAnalysis?.riskLevel,
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
      }
    } catch (err) {
      toast(err.message || 'Simulation engine error', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header-flex">
        <div className="card-title">
          <span className="dot dot-gold" />
          AI Contract Risk Simulation &amp; What-If Analysis
        </div>
        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
          Grounding-Guarded Scenario Engine
        </span>
      </div>

      <p className="text-lo mt-4 mb-16" style={{ fontSize: '13px' }}>
        Simulate hypothetical contractual events, test operational contingencies, and assess risk exposure grounded strictly in detected document provisions.
      </p>

      {/* 1. Scenario Input Area */}
      <div className="mb-20">
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1, padding: '10px 14px', fontSize: '13.5px' }}
            placeholder="e.g., What happens if the client pays 60 days late? What if we terminate without notice?"
            value={scenarioInput}
            onChange={(e) => setScenarioInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !simulating) handleSimulate();
            }}
            disabled={simulating}
          />
          <motion.button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSimulate()}
            disabled={simulating || !scenarioInput.trim()}
            style={{ minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            {...buttonMotion}
          >
            {simulating ? (
              <>
                <span className="spin">✦</span> Simulating…
              </>
            ) : (
              <>
                <span>🔮</span> Run Scenario
              </>
            )}
          </motion.button>
        </div>

        {/* Suggested Scenario Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          <span className="text-lo" style={{ fontSize: '11px', alignSelf: 'center', fontWeight: 600 }}>
            Suggested:
          </span>
          {SUGGESTED_SCENARIOS.map((s) => (
            <motion.button
              key={s.id}
              type="button"
              className="source-tag"
              onClick={() => {
                setScenarioInput(s.query);
                handleSimulate(s.query);
              }}
              disabled={simulating}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              {...buttonMotion}
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* 2. Simulation Result Card */}
      {simulating ? (
        <div style={{ padding: '36px 0', textAlign: 'center' }}>
          <SkeletonLoader.Card count={1} height="180px" />
          <div className="text-lo mt-12" style={{ fontSize: '12px' }}>
            🔍 Retrieving relevant contract provisions and performing scenario risk simulation…
          </div>
        </div>
      ) : activeSimulation ? (
        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          {activeSimulation.grounded === false ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '18px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, fontSize: '13.5px' }}>
                <span>⚠</span>
                <span>Information Not Found in Document — Speculative Simulation Refused</span>
              </div>
              <p className="text-mid small mt-8" style={{ lineHeight: '1.6' }}>
                {activeSimulation.simulationAnalysis?.potentialImpact ||
                  'The scenario could not be grounded in detected contract provisions. Deciva strictly prevents ungrounded speculative hallucinations.'}
              </p>
            </div>
          ) : (
            <>
              {/* Card A: Immutable Document Evidence */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📄 Found in Document ({activeSimulation.documentEvidence?.length || 0} Provisions)
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                    Immutable Contract Facts
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {activeSimulation.documentEvidence?.map((ev, evIdx) => (
                    <div
                      key={evIdx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        borderLeft: '3px solid var(--gold)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '12px',
                        color: 'var(--mid)',
                        lineHeight: '1.5'
                      }}
                    >
                      <strong style={{ color: 'var(--hi)', display: 'block', marginBottom: '4px' }}>
                        {ev.section}
                      </strong>
                      "{ev.excerpt}"
                    </div>
                  ))}
                </div>
              </div>

              {/* Card B: Hypothetical Impact & Risk Assessment */}
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.04)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  padding: '18px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--royal)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🔮 Hypothetical Scenario Analysis: "{activeSimulation.scenario}"
                  </span>
                  <span
                    className={`badge ${
                      activeSimulation.simulationAnalysis?.riskLevel === 'HIGH'
                        ? 'badge-danger'
                        : activeSimulation.simulationAnalysis?.riskLevel === 'LOW'
                        ? 'badge-ok'
                        : 'badge-warn'
                    }`}
                    style={{ fontSize: '10.5px' }}
                  >
                    {activeSimulation.simulationAnalysis?.riskLevel} RISK
                  </span>
                </div>

                {/* Potential Impact */}
                <div className="mb-14">
                  <div className="text-lo" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Potential Contractual Impact
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--hi)', lineHeight: '1.6', margin: 0 }}>
                    {activeSimulation.simulationAnalysis?.potentialImpact}
                  </p>
                </div>

                {/* Affected Areas */}
                {activeSimulation.simulationAnalysis?.affectedAreas?.length > 0 && (
                  <div className="mb-14">
                    <div className="text-lo" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Affected Contract Areas
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {activeSimulation.simulationAnalysis.affectedAreas.map((area, aIdx) => (
                        <span key={aIdx} className="source-tag" style={{ fontSize: '11px' }}>
                          📌 {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Possible Consequences */}
                {activeSimulation.simulationAnalysis?.possibleConsequences?.length > 0 && (
                  <div className="mb-14">
                    <div className="text-lo" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Potential Consequences
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--mid)', display: 'grid', gap: '4px' }}>
                      {activeSimulation.simulationAnalysis.possibleConsequences.map((c, cIdx) => (
                        <li key={cIdx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Next Steps */}
                {activeSimulation.simulationAnalysis?.recommendedNextSteps?.length > 0 && (
                  <div>
                    <div className="text-lo" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      🧭 Recommended Mitigation Steps
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: 'var(--hi)', display: 'grid', gap: '4px' }}>
                      {activeSimulation.simulationAnalysis.recommendedNextSteps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Disclaimer Banner */}
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--lo)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  textAlign: 'center'
                }}
              >
                ⚖️ {activeSimulation.simulationAnalysis?.disclaimer || DISCLAIMER_TEXT}
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* 3. Past Scenario Simulations History */}
      {history.length > 0 && (
        <div>
          <div className="text-lo mb-10" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Past Scenarios Tested ({history.length})
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {history.map((h, hIdx) => (
              <div
                key={h.id || hIdx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveSimulation(h)}
              >
                <div style={{ fontSize: '12.5px', color: 'var(--hi)', fontWeight: 500 }}>
                  🔮 {h.scenario}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    className={`badge ${
                      h.riskLevel === 'HIGH' ? 'badge-danger' : h.riskLevel === 'LOW' ? 'badge-ok' : 'badge-warn'
                    }`}
                    style={{ fontSize: '10px' }}
                  >
                    {h.riskLevel || 'MEDIUM'}
                  </span>
                  <span className="text-lo" style={{ fontSize: '11px' }}>
                    View →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationTab;
