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
      <div className="glass-auth-wrapper">
        {/* Ethereal Frosted Glass Ambient Light Orbs */}
        <div className="glass-orb glass-orb-1" />
        <div className="glass-orb glass-orb-2" />

        {/* Translucent Frosted Glass Card */}
        <motion.div
          className="glass-auth-card"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#1D1D1F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Icon.shield />
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.02em',
                color: '#0071E3',
                textTransform: 'uppercase'
              }}
            >
              Secure Firm Access
            </span>
            <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.03em', color: '#1D1D1F', margin: '4px 0 6px' }}>
              Sign In
            </h1>
            <p style={{ fontSize: '14px', color: '#6E6E73', margin: 0 }}>
              Enter your credentials to access the Chamber.
            </p>
          </div>

          <form id="loginForm" onSubmit={handleSubmit}>
            <div className="glass-input-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                className="glass-input"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@lawfirm.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="glass-input-group">
              <label htmlFor="login-pw">Password</label>
              <input
                id="login-pw"
                className="glass-input"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <motion.button
              className="glass-btn-submit"
              type="submit"
              disabled={submitting}
              {...buttonMotion}
            >
              {submitting ? 'Signing In…' : 'Sign In Securely'}
            </motion.button>
          </form>

          <p className="glass-auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(0, 0, 0, 0.06)'
            }}
          >
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              <Icon.lock /> Zero-Trust
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              <Icon.shield /> AES-256-GCM
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              <Icon.check /> SOC 2
            </span>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
