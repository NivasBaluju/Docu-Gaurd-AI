import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
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
      <div className="landing-container" style={{ paddingBottom: '72px' }}>
        {/* =========================================================
            SECTION 1: APPLE KEYNOTE HERO
            ========================================================= */}
        <section
          className="hero-section"
          style={{
            padding: '72px 24px 56px',
            maxWidth: '1120px',
            margin: '0 auto',
            textAlign: 'center'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 16px',
                borderRadius: '980px',
                background: 'rgba(0, 113, 227, 0.08)',
                color: '#0071E3',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '-0.01em',
                marginBottom: '20px'
              }}
            >
              <Icon.shield /> Introducing Docu-Gaurd AI 2.0
            </span>
          </motion.div>

          <motion.h1
            style={{
              fontSize: 'clamp(42px, 6.5vw, 76px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.06,
              margin: '12px auto 20px',
              maxWidth: '980px',
              color: '#1D1D1F'
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.06, ease: EASE_OUT }}
          >
            Legal intelligence.<br />
            <span
              style={{
                background: 'linear-gradient(180deg, #1D1D1F 0%, #6E6E73 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Supercharged by AI.
            </span>
          </motion.h1>

          <motion.p
            style={{
              fontSize: 'clamp(18px, 2.3vw, 22px)',
              lineHeight: 1.5,
              color: '#6E6E73',
              maxWidth: '680px',
              margin: '0 auto 36px',
              letterSpacing: '-0.018em'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12, ease: EASE_OUT }}
          >
            Understand, dissect, and cryptographically verify complex contracts in seconds. Built for counsel who demand perfection.
          </motion.p>

          {/* Action Pills */}
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
            transition={{ duration: 0.28, delay: 0.18, ease: EASE_OUT }}
          >
            <motion.button className="btn-hero" onClick={handleCta} {...buttonMotion}>
              {user ? 'Open Workspace' : 'Start Free Trial'}
            </motion.button>
            <motion.button
              className="btn-hero-ghost"
              onClick={() => navigate('/login')}
              {...buttonMotion}
            >
              Sign In to Firm →
            </motion.button>
          </motion.div>
        </section>

        {/* =========================================================
            SECTION 2: APPLE BENTO GRID (4 CORE CAPABILITIES)
            ========================================================= */}
        <section
          style={{
            maxWidth: '1120px',
            margin: '40px auto 0',
            padding: '0 24px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <span className="eyebrow-bullet">Core Innovations</span>
            <h2 style={{ fontSize: '36px', letterSpacing: '-0.03em', marginTop: '8px', color: '#1D1D1F' }}>
              Engineered with unmatched legal rigor.
            </h2>
            <p style={{ maxWidth: '580px', margin: '8px auto 0', color: '#6E6E73', fontSize: '16px' }}>
              Four pillars of intelligence and trust powering modern corporate law teams.
            </p>
          </div>

          <div className="grid grid-2" style={{ gap: '22px' }}>
            {/* Bento Card 1: Neural Reasoner */}
            <motion.div
              className="card"
              style={{
                background: '#FFFFFF',
                borderRadius: '26px',
                padding: '38px',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(0, 113, 227, 0.1)',
                  color: '#0071E3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '22px'
                }}
              >
                <Icon.chat />
              </div>
              <h3 style={{ fontSize: '23px', marginBottom: '10px', letterSpacing: '-0.024em', color: '#1D1D1F' }}>
                Multi-Pass Neural Reasoner
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#6E6E73' }}>
                Leveraging Gemini Pro LLMs to automatically isolate liabilities, indemnification traps, and payment obligations with citation-backed precision.
              </p>
            </motion.div>

            {/* Bento Card 2: Cryptographic Security */}
            <motion.div
              className="card"
              style={{
                background: '#FFFFFF',
                borderRadius: '26px',
                padding: '38px',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(52, 199, 89, 0.1)',
                  color: '#34C759',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '22px'
                }}
              >
                <Icon.lock />
              </div>
              <h3 style={{ fontSize: '23px', marginBottom: '10px', letterSpacing: '-0.024em', color: '#1D1D1F' }}>
                AES-256-GCM Envelope Security
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#6E6E73' }}>
                Every brief, contract, and addendum is symmetrically encrypted at rest with hardware-backed keys and evidentiary SHA-256 checksums.
              </p>
            </motion.div>

            {/* Bento Card 3: Instant Redlining */}
            <motion.div
              className="card"
              style={{
                background: '#FFFFFF',
                borderRadius: '26px',
                padding: '38px',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(255, 149, 0, 0.1)',
                  color: '#FF9500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '22px'
                }}
              >
                <Icon.pen />
              </div>
              <h3 style={{ fontSize: '23px', marginBottom: '10px', letterSpacing: '-0.024em', color: '#1D1D1F' }}>
                Negotiation Assistant &amp; Redlines
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#6E6E73' }}>
                Detect one-sided termination language and receive market-standard counter-proposals ready to insert directly into agreement drafts.
              </p>
            </motion.div>

            {/* Bento Card 4: Blockchain Audit Ledger */}
            <motion.div
              className="card"
              style={{
                background: '#FFFFFF',
                borderRadius: '26px',
                padding: '38px',
                border: '1px solid rgba(0, 0, 0, 0.06)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(175, 82, 222, 0.1)',
                  color: '#AF52DE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '22px'
                }}
              >
                <Icon.shield />
              </div>
              <h3 style={{ fontSize: '23px', marginBottom: '10px', letterSpacing: '-0.024em', color: '#1D1D1F' }}>
                Immutable Audit Ledger
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#6E6E73' }}>
                Every document view, export, redaction, and revision is cryptographically appended to an immutable chain to ensure courtroom non-repudiation.
              </p>
            </motion.div>
          </div>
        </section>

        {/* =========================================================
            SECTION 3: KEYNOTE FEATURE SPOTLIGHT
            ========================================================= */}
        <section
          style={{
            maxWidth: '1120px',
            margin: '72px auto 0',
            padding: '0 24px'
          }}
        >
          <div className="intelligence-spotlight">
            <div className="split" style={{ alignItems: 'center' }}>
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '980px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    fontSize: '12.5px',
                    color: '#FFFFFF',
                    marginBottom: '18px'
                  }}
                >
                  <Icon.shield /> Zero-Trust Security Sentinel
                </span>
                <h2 style={{ fontSize: '32px', marginBottom: '14px', letterSpacing: '-0.03em' }}>
                  Continuous Behavioral Telemetry
                </h2>
                <p style={{ fontSize: '16px', lineHeight: '1.65', color: '#A1A1A6', marginBottom: '24px' }}>
                  Docu-Gaurd calculates a real-time Zero-Trust confidence score for every active user session, monitoring IP risk, device authentication, and hardware MFA.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="badge badge-neutral" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.15)' }}>
                    ✓ TOTP &amp; Email MFA
                  </span>
                  <span className="badge badge-neutral" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.15)' }}>
                    ✓ 1-Click Session Revocation
                  </span>
                  <span className="badge badge-neutral" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.15)' }}>
                    ✓ RSA-2048 PKCS#1v15
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  padding: '28px',
                  textAlign: 'left'
                }}
              >
                <div className="mono small" style={{ color: '#6E6E73', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '16px' }}>
                  SECURITY_ASSURANCE_SUMMARY
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#D2D2D7', fontSize: '14px' }}>Zero-Trust Confidence:</span>
                    <span className="badge badge-ok">100% Score</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#D2D2D7', fontSize: '14px' }}>Data Encryption:</span>
                    <span className="badge badge-info">AES-256-GCM</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#D2D2D7', fontSize: '14px' }}>Audit Ledger Blocks:</span>
                    <span className="badge badge-ok">Chain Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 4: FINAL CALL TO ACTION
            ========================================================= */}
        <section
          style={{
            maxWidth: '880px',
            margin: '72px auto 0',
            padding: '52px 36px',
            background: '#FFFFFF',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: '32px',
            textAlign: 'center',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.04)'
          }}
        >
          <h2 style={{ fontSize: '38px', letterSpacing: '-0.035em', margin: '0 0 12px', color: '#1D1D1F' }}>
            Elevate your firm's legal intelligence.
          </h2>
          <p style={{ fontSize: '16.5px', color: '#6E6E73', maxWidth: '540px', margin: '0 auto 30px', letterSpacing: '-0.016em' }}>
            Start analyzing contracts with automated risk detection and cryptographic verification in under 30 seconds.
          </p>
          <motion.button className="btn-hero" onClick={handleCta} {...buttonMotion}>
            {user ? 'Enter Your Workspace' : 'Get Started Free'}
          </motion.button>
        </section>
      </div>
    </PageTransition>
  );
};

export default Landing;
