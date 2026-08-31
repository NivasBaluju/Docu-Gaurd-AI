import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import IntelligenceShowcase from '../components/landing/IntelligenceShowcase';
import { buttonMotion, EASE_OUT } from '../styles/motion';

export const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="landing-root" style={{ minHeight: 'calc(100vh - var(--topbar-h))', padding: '64px 20px 80px' }}>
      <div className="landing-center" style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
        {/* Eyebrow Label */}
        <motion.p
          className="landing-eyebrow"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          Enterprise Legal Intelligence
        </motion.p>

        {/* Headline */}
        <motion.h1
          className="landing-headline"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: EASE_OUT }}
        >
          Secure Legal AI<br />for Modern Law
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="landing-tagline"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.12, ease: EASE_OUT }}
        >
          Analyze, compare &amp; generate legal documents — in seconds.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="landing-actions"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18, ease: EASE_OUT }}
        >
          <motion.button
            className="btn-hero"
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            {...buttonMotion}
          >
            {user ? 'Open Dashboard' : 'Get Started'}
          </motion.button>
          <motion.button
            className="btn-hero-ghost"
            onClick={() => navigate('/login')}
            {...buttonMotion}
          >
            Sign in →
          </motion.button>
        </motion.div>

        {/* Signature Intelligence Showcase Visual */}
        <IntelligenceShowcase />
      </div>

      {/* Bottom Security Strip */}
      <motion.div
        className="landing-bottom"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <span>AES-256-GCM</span>
        <span className="lbar-dot" />
        <span>Zero-Trust Sessions</span>
        <span className="lbar-dot" />
        <span>Immutable Audit Ledger</span>
        <span className="lbar-dot" />
        <span>RSA-2048 Signatures</span>
        <span className="lbar-dot" />
        <span>GDPR · IT Act · ICA</span>
      </motion.div>
    </div>
  );
};

export default Landing;
