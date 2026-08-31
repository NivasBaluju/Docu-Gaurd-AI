import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import Icon from '../common/Icon';
import { EASE_OUT, cardHoverMotion } from '../../styles/motion';

export const IntelligenceShowcase = () => {
  const [activeTab, setActiveTab] = useState('clauses');
  const shouldReduceMotion = useReducedMotion();

  const tabs = [
    { id: 'clauses', label: 'Clause Intelligence', tag: '98% Confidence' },
    { id: 'risk', label: 'Risk Intelligence', tag: 'Score: 12/100' },
    { id: 'integrity', label: 'Cryptographic Proof', tag: 'SHA-256 Verified' }
  ];

  return (
    <motion.div
      className="card intelligence-showcase"
      style={{
        maxWidth: '860px',
        margin: '52px auto 0',
        padding: '0',
        overflow: 'hidden',
        background: 'var(--surface-white)',
        border: '1px solid var(--border-mid)',
        boxShadow: 'var(--shadow-float)',
        borderRadius: 'var(--radius-lg)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
      {...cardHoverMotion}
    >
      {/* Chamber Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'var(--canvas-subtle)',
          borderBottom: '1px solid var(--border-hairline)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444', opacity: 0.8 }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F59E0B', opacity: 0.8 }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10B981', opacity: 0.8 }} />
          </div>
          <span className="mono text-muted small" style={{ marginLeft: '8px', fontSize: '12px' }}>
            master_services_agreement_v3.pdf
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-gold" style={{ fontSize: '11px' }}>
            <Icon.shield /> Cryptographically Sealed
          </span>
          <span className="badge badge-ok" style={{ fontSize: '11px' }}>
            <Icon.check /> SOC Verified
          </span>
        </div>
      </div>

      {/* Mode Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 20px',
          borderBottom: '1px solid var(--border-hairline)',
          background: 'var(--surface-cream)'
        }}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--surface-white)' : 'transparent',
                color: isActive ? 'var(--royal-cobalt)' : 'var(--ink-muted)',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                boxShadow: isActive ? '0 2px 6px rgba(15, 23, 42, 0.05)' : 'none',
                transition: 'all 0.16s ease'
              }}
            >
              <span>{t.label}</span>
              <span
                style={{
                  fontSize: '10.5px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: isActive ? 'var(--royal-light)' : 'rgba(15, 23, 42, 0.05)',
                  color: isActive ? 'var(--royal-cobalt)' : 'var(--ink-muted)'
                }}
              >
                {t.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Living Document Surface */}
      <div style={{ padding: '28px 32px', textAlign: 'left' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'clauses' && (
            <motion.div
              key="clauses"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              <div className="flex-between mb-12">
                <span className="eyebrow-bullet">Extracted Clause Analysis</span>
                <span className="badge badge-info">Gemini AI Model</span>
              </div>
              <div
                style={{
                  background: 'var(--canvas-bg)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '18px 22px',
                  fontFamily: 'var(--font-legal)',
                  fontSize: '14.5px',
                  lineHeight: '1.8',
                  color: 'var(--ink-primary)',
                  marginBottom: '16px'
                }}
              >
                <strong style={{ color: 'var(--ink-primary)' }}>Section 11.2 (Limitation of Liability):</strong> In no event shall either party's aggregate liability arising out of or related to this Agreement exceed the total amount paid by Customer hereunder in the{' '}
                <mark style={{ background: 'rgba(200, 169, 90, 0.3)', padding: '2px 6px', borderRadius: '3px', borderBottom: '1.5px solid var(--gold-seal)' }}>
                  twelve (12) months
                </mark>{' '}
                preceding the incident. Neither party shall be liable for indirect, punitive, or consequential damages.
              </div>
              <div
                style={{
                  background: 'var(--emerald-bg)',
                  border: '1px solid var(--emerald-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 18px',
                  fontSize: '13.5px'
                }}
              >
                <strong style={{ color: 'var(--emerald)' }}>Plain English Translation:</strong> Standard bilateral liability cap. Liability is strictly limited to actual fees paid over the previous year, protecting both sides against unlimited punitive damages.
              </div>
            </motion.div>
          )}

          {activeTab === 'risk' && (
            <motion.div
              key="risk"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              <div className="flex-between mb-16">
                <span className="eyebrow-bullet">Automated Risk Assessment</span>
                <span className="badge badge-ok" style={{ fontSize: '13px' }}>
                  Low Risk Score: 12 / 100
                </span>
              </div>
              <div className="grid grid-2" style={{ gap: '14px' }}>
                <div style={{ padding: '16px', background: 'var(--canvas-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
                  <div className="flex-between small bold mb-8">
                    <span style={{ color: 'var(--ink-primary)' }}>Termination Provisions</span>
                    <span className="badge badge-ok">0% (Safe)</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--canvas-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '0%', height: '100%', background: 'var(--emerald)' }} />
                  </div>
                  <p className="text-muted small mt-8" style={{ fontSize: '12px' }}>Mutual 30-day notice with immediate termination on material breach.</p>
                </div>

                <div style={{ padding: '16px', background: 'var(--canvas-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
                  <div className="flex-between small bold mb-8">
                    <span style={{ color: 'var(--ink-primary)' }}>Liability Caps</span>
                    <span className="badge badge-ok">15% (Low)</span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--canvas-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '15%', height: '100%', background: 'var(--emerald)' }} />
                  </div>
                  <p className="text-muted small mt-8" style={{ fontSize: '12px' }}>Bilateral cap tied to 12-month contract value.</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'integrity' && (
            <motion.div
              key="integrity"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              <div className="flex-between mb-12">
                <span className="eyebrow-bullet">Cryptographic Fingerprint &amp; Ledger</span>
                <span className="badge badge-ok"><Icon.check /> SHA-256 Validated</span>
              </div>
              <div
                className="mono small"
                style={{
                  background: 'var(--canvas-bg)',
                  border: '1px solid var(--border-hairline)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink-secondary)',
                  wordBreak: 'break-all',
                  fontSize: '12.5px',
                  lineHeight: '1.6'
                }}
              >
                <strong>SHA-256:</strong> e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855<br />
                <strong>Block Index:</strong> #114 · <strong>Algorithm:</strong> AES-256-GCM · <strong>Signature:</strong> RSA-2048 PKCS#1v15
              </div>
              <p className="text-muted small mt-12">
                Every document uploaded is cryptographically hashed, symmetrically encrypted, and logged to the immutable audit ledger to guarantee evidentiary non-repudiation.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default IntelligenceShowcase;
