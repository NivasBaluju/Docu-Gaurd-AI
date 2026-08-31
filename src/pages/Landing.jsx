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
      <div className="landing-container" style={{ background: '#000000', color: '#FFFFFF', paddingBottom: '72px' }}>
        {/* =========================================================
            SECTION 1: DARK MINIMALIST LEGAL HERO
            ========================================================= */}
        <section
          className="hero-section"
          style={{
            padding: '72px 24px 48px',
            maxWidth: '1180px',
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative'
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
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: '600',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '24px'
              }}
            >
              [DOCU-GAURD_AI_2.0] · CRYPTOGRAPHIC LEGAL INTELLIGENCE
            </span>
          </motion.div>

          <motion.h1
            style={{
              fontSize: 'clamp(42px, 6.8vw, 82px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              margin: '12px auto 22px',
              maxWidth: '1000px',
              color: '#FFFFFF'
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.06, ease: EASE_OUT }}
          >
            Legal intelligence.<br />
            <span
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #71717A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Cryptographically verified.
            </span>
          </motion.h1>

          <motion.p
            style={{
              fontSize: 'clamp(17px, 2.2vw, 21px)',
              lineHeight: 1.55,
              color: '#A1A1AA',
              maxWidth: '680px',
              margin: '0 auto 36px',
              letterSpacing: '-0.016em'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12, ease: EASE_OUT }}
          >
            Understand, dissect, and cryptographically verify complex contracts in seconds. Built for counsel who demand institutional precision.
          </motion.p>

          {/* Minimalist Action Buttons */}
          <motion.div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '56px'
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.18, ease: EASE_OUT }}
          >
            <motion.button className="btn-hero" onClick={handleCta} {...buttonMotion}>
              {user ? 'Enter Chamber' : 'Start Firm Access'}
            </motion.button>
            <motion.button
              className="btn-hero-ghost"
              onClick={() => navigate('/login')}
              {...buttonMotion}
            >
              Chamber Sign In →
            </motion.button>
          </motion.div>

          {/* Classical Dithered Courthouse Facade Frame */}
          <motion.div
            style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9)'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24, ease: EASE_OUT }}
          >
            <img
              src="/assets/courthouse-hero.jpg"
              alt="Supreme Court Facade Dither Art"
              style={{
                width: '100%',
                maxHeight: '480px',
                objectFit: 'cover',
                display: 'block',
                filter: 'contrast(1.15) brightness(0.95)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, #000000 0%, transparent 60%), radial-gradient(circle at 50% 50%, transparent 50%, #000000 100%)',
                pointerEvents: 'none'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                left: '28px',
                right: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 2
              }}
            >
              <span className="mono" style={{ fontSize: '12px', color: '#A1A1AA', letterSpacing: '0.05em' }}>
                [INSTITUTIONAL_LEGAL_AI_STANDARDS]
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-neutral">EQUAL JUSTICE UNDER LAW</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* =========================================================
            SECTION 2: BLACK MINIMALIST BENTO GRID
            ========================================================= */}
        <section
          style={{
            maxWidth: '1180px',
            margin: '64px auto 0',
            padding: '0 24px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <span className="eyebrow-bullet">CORE INNOVATIONS</span>
            <h2 style={{ fontSize: '36px', letterSpacing: '-0.03em', marginTop: '8px', color: '#FFFFFF' }}>
              Engineered with courtroom rigor.
            </h2>
            <p style={{ maxWidth: '580px', margin: '8px auto 0', color: '#A1A1AA', fontSize: '16px' }}>
              Four pillars of intelligence and cryptographic trust powering top corporate law teams.
            </p>
          </div>

          <div className="grid grid-2" style={{ gap: '22px' }}>
            {/* Bento Card 1: Neural Reasoner */}
            <motion.div
              className="card"
              style={{
                background: '#0D0D10',
                borderRadius: '24px',
                padding: '36px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <Icon.chat />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.024em', color: '#FFFFFF' }}>
                Multi-Pass Neural Reasoner
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#A1A1AA' }}>
                Leveraging Gemini Pro LLMs to automatically isolate liabilities, indemnification traps, and payment obligations with citation-backed precision.
              </p>
            </motion.div>

            {/* Bento Card 2: Cryptographic Security */}
            <motion.div
              className="card"
              style={{
                background: '#0D0D10',
                borderRadius: '24px',
                padding: '36px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <Icon.lock />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.024em', color: '#FFFFFF' }}>
                AES-256-GCM Envelope Security
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#A1A1AA' }}>
                Every brief, contract, and addendum is symmetrically encrypted at rest with hardware-backed keys and evidentiary SHA-256 checksums.
              </p>
            </motion.div>

            {/* Bento Card 3: Instant Redlining */}
            <motion.div
              className="card"
              style={{
                background: '#0D0D10',
                borderRadius: '24px',
                padding: '36px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <Icon.pen />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.024em', color: '#FFFFFF' }}>
                Negotiation Assistant &amp; Redlines
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#A1A1AA' }}>
                Detect one-sided termination language and receive market-standard counter-proposals ready to insert directly into agreement drafts.
              </p>
            </motion.div>

            {/* Bento Card 4: Blockchain Audit Ledger */}
            <motion.div
              className="card"
              style={{
                background: '#0D0D10',
                borderRadius: '24px',
                padding: '36px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              {...cardHoverMotion}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <Icon.shield />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.024em', color: '#FFFFFF' }}>
                Immutable Audit Ledger
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#A1A1AA' }}>
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
            maxWidth: '1180px',
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
                <p style={{ fontSize: '16px', lineHeight: '1.65', color: '#A1A1AA', marginBottom: '24px' }}>
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
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  padding: '28px',
                  textAlign: 'left'
                }}
              >
                <div className="mono small" style={{ color: '#71717A', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px', marginBottom: '16px' }}>
                  SECURITY_ASSURANCE_SUMMARY
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#D4D4D8', fontSize: '14px' }}>Zero-Trust Confidence:</span>
                    <span className="badge badge-ok">100% Score</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#D4D4D8', fontSize: '14px' }}>Data Encryption:</span>
                    <span className="badge badge-info">AES-256-GCM</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#D4D4D8', fontSize: '14px' }}>Audit Ledger Blocks:</span>
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
            background: '#0D0D10',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '32px',
            textAlign: 'center',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8)'
          }}
        >
          <h2 style={{ fontSize: '38px', letterSpacing: '-0.035em', margin: '0 0 12px', color: '#FFFFFF' }}>
            Elevate your firm's legal intelligence.
          </h2>
          <p style={{ fontSize: '16.5px', color: '#A1A1AA', maxWidth: '540px', margin: '0 auto 30px', letterSpacing: '-0.016em' }}>
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
