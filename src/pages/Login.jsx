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
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ email: '', password: '' });

    if (!email) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter your email address' }));
      return;
    }
    if (!password) {
      setFieldErrors(prev => ({ ...prev, password: 'Please enter your password' }));
      return;
    }

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
      const errMsg = err.message || 'Authentication failed';
      const lower = errMsg.toLowerCase();
      if (lower.includes('password') || lower.includes('credentials') || lower.includes('invalid email or password')) {
        setFieldErrors({ email: '', password: 'Incorrect password. Please try again.' });
      } else if (lower.includes('email') || lower.includes('account') || lower.includes('user not found')) {
        setFieldErrors({ email: errMsg, password: '' });
      } else {
        setFieldErrors({ email: '', password: errMsg });
      }
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

            <form id="loginForm" onSubmit={handleSubmit} noValidate>
              {/* Email Field */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Email address
                </label>
                <input
                  id="login-email"
                  className={`auth-input-field ${fieldErrors.email ? 'input-error' : ''}`}
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleEmailChange}
                  autoComplete="email"
                  required
                />
                {fieldErrors.email && (
                  <div className="auth-field-error">
                    <span>⚠</span>
                    <span>{fieldErrors.email}</span>
                  </div>
                )}
              </div>

              {/* Password Field with Show/Hide Toggle */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="login-pw"
                    className={`auth-input-field ${fieldErrors.password ? 'input-error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="auth-field-error">
                    <span>⚠</span>
                    <span>{fieldErrors.password}</span>
                  </div>
                )}
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
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '11px',
                color: '#71717A'
              }}
            >
              <span className="dot dot-emerald" />
              <span>Zero-Trust 256-Bit Hardware Enclave Active</span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
