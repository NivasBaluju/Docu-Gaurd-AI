import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import Icon from '../common/Icon';
import { EASE_OUT, cardHoverMotion } from '../../styles/motion';

export const IntelligenceShowcase = () => {
  const [activeFeature, setActiveFeature] = useState('clauses');
  const shouldReduceMotion = useReducedMotion();

  const features = [
    { id: 'clauses', label: 'Clause Intelligence', icon: <Icon.document /> },
    { id: 'risk', label: 'Risk Analysis (Low 8/100)', icon: <Icon.shield /> },
    { id: 'integrity', label: 'Cryptographic SHA-256', icon: <Icon.check /> },
  ];

  return (
    <motion.div
      className="card intelligence-showcase"
      style={{
        maxWidth: '820px',
        margin: '48px auto 0',
        padding: '0',
        overflow: 'hidden',
        background: 'var(--white)',
        border: '1px solid rgba(15, 23, 42, 0.1)',
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.03)'
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25, ease: EASE_OUT }}
      {...cardHoverMotion}
    >
      {/* Top Demo Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--warm-beige)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', opacity: 0.7 }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', opacity: 0.7 }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', opacity: 0.7 }} />
          <span className="mono small text-lo" style={{ marginLeft: '10px', fontSize: '11.5px' }}>
            sample_master_services_agreement.pdf (Preview)
          </span>
        </div>
        <span className="badge badge-info" style={{ fontSize: '11px' }}>
          Interactive Demo
        </span>
      </div>

      {/* Feature Selector Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--white)',
          padding: '4px 12px',
          gap: '6px'
        }}
      >
        {features.map((f) => {
          const isActive = activeFeature === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--royal-light)' : 'transparent',
                color: isActive ? 'var(--royal)' : 'var(--text-mid)',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.18s ease'
              }}
            >
              {f.icon} {f.label}
            </button>
          );
        })}
      </div>

      {/* Main Document Insight Body */}
      <div style={{ padding: '24px 28px', textAlign: 'left' }}>
        {activeFeature === 'clauses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="eyebrow-bullet">Extracted Clause Analysis</span>
              <span className="badge badge-ok">Confidence: 98%</span>
            </div>
            <div
              style={{
                background: 'var(--off-white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                fontSize: '13.5px',
                lineHeight: '1.7',
                color: 'var(--charcoal)',
                marginBottom: '14px'
              }}
            >
              <strong style={{ color: 'var(--navy)' }}>Section 11.2 (Limitation of Liability):</strong> Neither party shall be liable for indirect, incidental, or consequential damages. Total aggregate liability shall not exceed the fees paid in the preceding <mark style={{ background: 'var(--gold-light)', padding: '2px 6px', borderRadius: '4px' }}>twelve (12) months</mark>.
            </div>
            <p className="text-mid small">
              <strong>Plain English:</strong> Standard bilateral liability cap protecting both parties against runaway damages.
            </p>
          </div>
        )}

        {activeFeature === 'risk' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="eyebrow-bullet">Automated Risk Breakdown</span>
              <span className="badge badge-ok">Low Risk Score: 8 / 100</span>
            </div>
            <div className="grid grid-2" style={{ gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="flex-between small bold mb-4">
                  <span>Termination Provisions</span>
                  <span className="badge badge-ok">0% (Low)</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '0%', height: '100%', background: 'var(--emerald)' }} />
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="flex-between small bold mb-4">
                  <span>Liability Caps</span>
                  <span className="badge badge-ok">15% (Low)</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '15%', height: '100%', background: 'var(--emerald)' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeFeature === 'integrity' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="eyebrow-bullet">Cryptographic Integrity</span>
              <span className="badge badge-ok"><Icon.check /> SHA-256 Validated</span>
            </div>
            <p className="mono small text-lo" style={{ wordBreak: 'break-all', background: 'var(--off-white)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
            </p>
            <p className="text-mid small mt-12">
              All documents are AES-256-GCM encrypted with unalterable cryptographic hashes logged to the blockchain audit ledger.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default IntelligenceShowcase;
