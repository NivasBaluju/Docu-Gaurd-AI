import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import { buttonMotion } from '../styles/motion';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await Api.post('/api/auth/login', { email, password });
      if (result.mfaRequired) {
        sessionStorage.setItem('preToken', result.preToken);
        navigate('/mfa');
        return;
      }
      await login(result.token, result.user);
      toast('Signed in securely', 'ok');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="dark-art-auth-container">
        {/* Left Side: Minimalist Black Editorial Form */}
        <div className="dark-art-form-side">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Minimalist Brand Symbol */}
            <div style={{ marginBottom: '32px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '1.5px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px'
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFFFFF' }} />
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.035em', color: '#FFFFFF', margin: '0 0 8px' }}>
                Chamber Sign In
              </h1>
              <p style={{ fontSize: '14px', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
                Enter your credentials to access encrypted document intelligence.
              </p>
            </div>

            <form id="loginForm" onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Email address
                </label>
                <input
                  id="login-email"
                  className="dark-input-field"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="counsel@firm.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  id="login-pw"
                  className="dark-input-field"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <motion.button
                className="dark-btn-action"
                type="submit"
                disabled={submitting}
                {...buttonMotion}
              >
                {submitting ? 'Authenticating…' : 'Authenticate & Enter'}
              </motion.button>
            </form>

            <div style={{ marginTop: '28px', fontSize: '13px', color: '#71717A' }}>
              No access key yet?{' '}
              <Link to="/register" style={{ color: '#FFFFFF', fontWeight: '600', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                Register firm
              </Link>
            </div>

            {/* Monospace Trust Badges */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <span className="mono" style={{ fontSize: '11px', color: '#52525B' }}>
                [ZERO-TRUST_ACTIVE]
              </span>
              <span className="mono" style={{ fontSize: '11px', color: '#52525B' }}>
                [AES-256-GCM]
              </span>
              <span className="mono" style={{ fontSize: '11px', color: '#52525B' }}>
                [SHA-256_VERIFIED]
              </span>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Dithered Pointillist Classical Pillar Art */}
        <div className="dark-art-display-side">
          <img
            src="/assets/justice-pillars.jpg"
            alt="Classical Roman Columns and Architecture Dither Art"
            className="dark-art-img"
          />
          <div className="dark-art-overlay" />
          
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              textAlign: 'right',
              maxWidth: '380px',
              zIndex: 3
            }}
          >
            <p className="mono" style={{ fontSize: '11px', color: '#71717A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Legal Rigor · Cryptographic Non-Repudiation
            </p>
            <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0, fontStyle: 'italic' }}>
              "Justice is the constant and perpetual will to allot to every man his due."
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;
