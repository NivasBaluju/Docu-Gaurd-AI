import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FloatCard = ({ emoji, title, sub }) => (
  <div className="lf-card">
    <div className="lf-emoji">{emoji}</div>
    <div className="lf-title">{title}</div>
    <div className="lf-sub">{sub}</div>
  </div>
);

export const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="landing-root">
      {/* Scattered floating legal-insight cards */}
      <div className="landing-float landing-float--tl fade-up">
        <FloatCard emoji="⚖️" title="Contract Review" sub="AI clause extraction" />
      </div>
      <div className="landing-float landing-float--tr fade-up fade-up-1">
        <FloatCard emoji="🔒" title="AES-256 Encrypted" sub="Zero-trust security" />
      </div>
      <div className="landing-float landing-float--ml fade-up fade-up-2">
        <FloatCard emoji="📄" title="9 AI Capabilities" sub="All in one platform" />
      </div>
      <div className="landing-float landing-float--mr fade-up fade-up-1">
        <FloatCard emoji="🛡️" title="Compliance" sub="GDPR · IT Act · ICA" />
      </div>
      <div className="landing-float landing-float--bl fade-up fade-up-3">
        <FloatCard emoji="✍️" title="e-Contracts" sub="RSA-2048 digital sig" />
      </div>
      <div className="landing-float landing-float--br fade-up fade-up-2">
        <FloatCard emoji="📊" title="Risk Score" sub="0–100 instant analysis" />
      </div>

      {/* Dead-centre content */}
      <div className="landing-center">
        <p className="landing-eyebrow fade-up">Enterprise Legal Intelligence</p>
        <h1 className="landing-headline fade-up fade-up-1">
          Secure Legal AI<br />for Modern Law
        </h1>
        <p className="landing-tagline fade-up fade-up-2">
          Analyze, compare &amp; generate legal documents — in seconds.
        </p>
        <div className="landing-actions fade-up fade-up-3">
          <button
            className="btn-hero"
            onClick={() => navigate(user ? '/dashboard' : '/register')}
          >
            {user ? 'Open Dashboard' : 'Get Started'}
          </button>
          <button
            className="btn-hero-ghost"
            onClick={() => navigate('/login')}
          >
            Sign in →
          </button>
        </div>
      </div>

      {/* Bottom security strip */}
      <div className="landing-bottom fade-up fade-up-4">
        <span>AES-256-GCM</span>
        <span className="lbar-dot" />
        <span>Zero-Trust Sessions</span>
        <span className="lbar-dot" />
        <span>Immutable Audit Ledger</span>
        <span className="lbar-dot" />
        <span>RSA-2048 Signatures</span>
        <span className="lbar-dot" />
        <span>GDPR · IT Act · ICA</span>
      </div>
    </div>
  );
};

export default Landing;
