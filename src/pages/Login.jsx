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
      <div className="auth-minimal-wrapper">
        {/* Landscape Ambient Background Glow */}
        <div className="auth-landscape-bg" />
        <div className="auth-landscape-overlay" />

        {/* Compact Centered Minimalist Auth Card */}
        <motion.div
          className="auth-compact-card"
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Landscape Dither Header Banner */}
          <div className="auth-card-landscape-banner">
            <img
              src="/assets/lady-justice.jpg"
              alt="Lady Justice Landscape Dither Art"
              className="auth-card-banner-img"
            />
            <div className="auth-card-banner-overlay" />
          </div>

          <div style={{ padding: '24px 28px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <span className="mono" style={{ fontSize: '11px', color: '#71717A', letterSpacing: '0.06em' }}>
                [ZERO-TRUST_CHAMBER]
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em', color: '#FFFFFF', margin: '4px 0 2px' }}>
                Sign In
              </h1>
              <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                Access encrypted legal intelligence workspace
              </p>
            </div>

            <form id="loginForm" onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Email address
                </label>
                <input
                  id="login-email"
                  className="auth-input-field"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="counsel@firm.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Password
                </label>
                <input
                  id="login-pw"
                  className="auth-input-field"
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
                className="auth-btn-action"
                type="submit"
                disabled={submitting}
                {...buttonMotion}
              >
                {submitting ? 'Authenticating…' : 'Sign In'}
              </motion.button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12.5px', color: '#71717A' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#FFFFFF', fontWeight: '500' }}>
                Create one
              </Link>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <span className="mono" style={{ fontSize: '10.5px', color: '#52525B' }}>AES-256-GCM</span>
              <span className="mono" style={{ fontSize: '10.5px', color: '#52525B' }}>·</span>
              <span className="mono" style={{ fontSize: '10.5px', color: '#52525B' }}>SHA-256</span>
              <span className="mono" style={{ fontSize: '10.5px', color: '#52525B' }}>·</span>
              <span className="mono" style={{ fontSize: '10.5px', color: '#52525B' }}>SOC 2</span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
