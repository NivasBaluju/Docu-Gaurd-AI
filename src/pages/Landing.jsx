import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import IntelligenceShowcase from '../components/landing/IntelligenceShowcase';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import { buttonMotion, EASE_OUT, cardHoverMotion } from '../styles/motion';

export const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCta = () => {
    navigate(user ? '/dashboard' : '/register');
  };

  return (
    <PageTransition>
      <div className="landing-container" style={{ paddingBottom: '96px' }}>
        {/* =========================================================
            SECTION 1: THE MANIFESTO & INTELLIGENCE CHAMBER HERO
            ========================================================= */}
        <section
          className="hero-section"
          style={{
            padding: '72px 24px 64px',
            maxWidth: '1160px',
            margin: '0 auto',
            textAlign: 'center'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            <span className="eyebrow-bullet">The Legal Intelligence Chamber</span>
          </motion.div>

          <motion.h1
            style={{
              fontSize: 'clamp(36px, 5.5vw, 62px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              margin: '18px auto 20px',
              maxWidth: '920px',
              color: 'var(--ink-primary)'
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: EASE_OUT }}
          >
            Where Legal Complexity<br />
            <span style={{ fontStyle: 'italic', color: 'var(--royal-cobalt)' }}>Meets Cryptographic Intelligence.</span>
          </motion.h1>

          <motion.p
            style={{
              fontSize: 'clamp(16px, 2vw, 19px)',
              lineHeight: 1.65,
              color: 'var(--ink-secondary)',
              maxWidth: '680px',
              margin: '0 auto 32px'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.14, ease: EASE_OUT }}
          >
            Docu-Gaurd AI dissects, reasons about, and cryptographically verifies dense contracts — translating ambiguity into actionable legal precision.
          </motion.p>

          {/* Action Dock */}
          <motion.div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: EASE_OUT }}
          >
            <motion.button className="btn-hero" onClick={handleCta} {...buttonMotion}>
              {user ? 'Open Workspace' : 'Begin Free Trial'}
            </motion.button>
            <motion.button
              className="btn-hero-ghost"
              onClick={() => navigate('/login')}
              {...buttonMotion}
            >
              Sign In to Firm →
            </motion.button>
          </motion.div>

          {/* Living Document Intelligence Showcase */}
          <IntelligenceShowcase />
        </section>

        {/* =========================================================
            SECTION 2: THE LEGAL PROBLEM (EDITORIAL ANALYSIS)
            ========================================================= */}
        <section
          style={{
            maxWidth: '1160px',
            margin: '80px auto 0',
            padding: '0 24px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="eyebrow-bullet">The Problem</span>
            <h2 style={{ fontSize: '32px', marginTop: '10px' }}>
              Why Conventional Contract Review Fails
            </h2>
            <p style={{ maxWidth: '600px', margin: '8px auto 0', color: 'var(--ink-muted)' }}>
              Legal teams spend 60% of their billing hours manually cross-checking dense clauses, exposing firms to silent indemnification liabilities.
            </p>
          </div>

          <div className="grid grid-3">
            <motion.div className="card" {...cardHoverMotion}>
              <div className="card-title">
                <span className="dot dot-red" />
                01. Hidden Liability Traps
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-secondary)' }}>
                Unlimited consequential damages, asymmetrical indemnities, and unilateral termination clauses buried in standard boilerplates without notice.
              </p>
            </motion.div>

            <motion.div className="card" {...cardHoverMotion}>
              <div className="card-title">
                <span className="dot dot-amber" />
                02. Unverified Redlines
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-secondary)' }}>
                Version sprawl across email threads leads to conflicting amendments, forged signatures, and undetectable clause alterations.
              </p>
            </motion.div>

            <motion.div className="card" {...cardHoverMotion}>
              <div className="card-title">
                <span className="dot dot-gold" />
                03. Regulatory Exposure
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink-secondary)' }}>
                Evolving jurisdictional frameworks (GDPR, Indian Contract Act, IT Act) leave un-audited agreements non-compliant and legally unenforceable.
              </p>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            SECTION 3: THE INTELLIGENCE ENGINE (HOW IT REASONS)
            ========================================================= */}
        <section
          style={{
            maxWidth: '1160px',
            margin: '96px auto 0',
            padding: '0 24px'
          }}
        >
          <div className="intelligence-spotlight">
            <div className="split" style={{ alignItems: 'center' }}>
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '16px' }}>
                  <Icon.shield /> The Reasoning Engine
                </span>
                <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>
                  Multi-Pass Neural Legal Analysis
                </h2>
                <p style={{ fontSize: '15.5px', lineHeight: '1.7', color: '#CBD5E1', marginBottom: '24px' }}>
                  Docu-Gaurd does not merely search keywords. It employs structured multi-pass reasoning to analyze party relationships, indemnification obligations, payment schedules, and compliance metrics.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="badge badge-neutral" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}>
                    ✓ 98% OCR Accuracy
                  </span>
                  <span className="badge badge-neutral" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}>
                    ✓ Heuristic Risk Scoring (0–100)
                  </span>
                  <span className="badge badge-neutral" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}>
                    ✓ Gemini LLM Integration
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius)',
                  padding: '24px'
                }}
              >
                <div className="mono small text-lo" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '14px' }}>
                  [AI_REASONING_PIPELINE]
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="dot dot-emerald" />
                    <span style={{ fontSize: '13.5px', color: '#F1F5F9' }}>1. Document Ingestion &amp; SHA-256 Hashing</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="dot dot-emerald" />
                    <span style={{ fontSize: '13.5px', color: '#F1F5F9' }}>2. OCR &amp; Clause Extraction (Liability, Termination, IP)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="dot dot-gold" />
                    <span style={{ fontSize: '13.5px', color: '#F1F5F9' }}>3. Plain English Translation &amp; Redline Generation</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="dot dot-gold" />
                    <span style={{ fontSize: '13.5px', color: '#F1F5F9' }}>4. Cryptographic Blockchain Audit Ledger Entry</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 4: INSTITUTIONAL TRUST & CRYPTOGRAPHIC SECURITY
            ========================================================= */}
        <section
          style={{
            maxWidth: '1160px',
            margin: '96px auto 0',
            padding: '0 24px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="eyebrow-bullet">Institutional Trust</span>
            <h2 style={{ fontSize: '32px', marginTop: '10px' }}>
              Built to SOC 2 &amp; Zero-Trust Standards
            </h2>
            <p style={{ maxWidth: '620px', margin: '8px auto 0', color: 'var(--ink-muted)' }}>
              Client files remain strictly confidential with end-to-end symmetric encryption and hardware-secured token signatures.
            </p>
          </div>

          <div className="grid grid-4">
            <motion.div className="card" {...cardHoverMotion}>
              <div className="metric-icon-wrap metric-icon-blue mb-16">
                <Icon.lock />
              </div>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>AES-256-GCM</h4>
              <p style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                Authenticated symmetric encryption for every document stored at rest.
              </p>
            </motion.div>

            <motion.div className="card" {...cardHoverMotion}>
              <div className="metric-icon-wrap metric-icon-gold mb-16">
                <Icon.pen />
              </div>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>RSA-2048 Signing</h4>
              <p style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                Digital signature imprints guarantee contractual non-repudiation.
              </p>
            </motion.div>

            <motion.div className="card" {...cardHoverMotion}>
              <div className="metric-icon-wrap metric-icon-green mb-16">
                <Icon.shield />
              </div>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Zero-Trust Scoring</h4>
              <p style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                Continuous behavioral scoring assessing IP, device, and MFA telemetry.
              </p>
            </motion.div>

            <motion.div className="card" {...cardHoverMotion}>
              <div className="metric-icon-wrap metric-icon-navy mb-16">
                <Icon.check />
              </div>
              <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Audit Ledger</h4>
              <p style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                Immutable SHA-256 blockchain chain verifying every document lifecycle event.
              </p>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            SECTION 5: FINAL INSTITUTIONAL CALL TO ACTION
            ========================================================= */}
        <section
          style={{
            maxWidth: '920px',
            margin: '96px auto 0',
            padding: '48px 32px',
            background: 'var(--surface-white)',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-xl)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <span className="eyebrow-bullet">Get Started Today</span>
          <h2 style={{ fontSize: '36px', margin: '14px 0 16px' }}>
            Elevate Your Firm's Document Intelligence
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--ink-secondary)', maxWidth: '560px', margin: '0 auto 28px' }}>
            Analyze your first contract in under 30 seconds with automated risk detection and cryptographic verification.
          </p>
          <motion.button className="btn-hero" onClick={handleCta} {...buttonMotion}>
            {user ? 'Enter Your Workspace' : 'Create Free Account'}
          </motion.button>
        </section>
      </div>
    </PageTransition>
  );
};

export default Landing;
