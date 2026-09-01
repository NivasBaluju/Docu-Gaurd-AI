import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import { buttonMotion } from '../styles/motion';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
  };

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
    setFieldErrors({ name: '', email: '', password: '' });

    let hasErr = false;
    if (!name.trim()) {
      setFieldErrors(prev => ({ ...prev, name: 'Please enter your full name' }));
      hasErr = true;
    }
    if (!email.trim()) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter your work email' }));
      hasErr = true;
    }
    if (!password || password.length < 8) {
      setFieldErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
      hasErr = true;
    }
    if (hasErr) return;

    setSubmitting(true);
    try {
      await Api.post('/api/auth/register', { name, email, password });
      toast('Account created — please sign in', 'ok');
      navigate('/login');
    } catch (err) {
      const errMsg = err.message || 'Registration failed';
      const lower = errMsg.toLowerCase();
      if (lower.includes('email already exists') || lower.includes('email')) {
        setFieldErrors(prev => ({ ...prev, email: errMsg }));
      } else if (lower.includes('password')) {
        setFieldErrors(prev => ({ ...prev, password: errMsg }));
      } else {
        setFieldErrors(prev => ({ ...prev, email: errMsg }));
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
                [FIRM_PROVISIONING]
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em', color: '#FFFFFF', margin: '4px 0 2px' }}>
                Create Account
              </h1>
              <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                Initialize your firm's encrypted workspace
              </p>
            </div>

            <form id="regForm" onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Full name
                </label>
                <input
                  id="reg-name"
                  className={`auth-input-field ${fieldErrors.name ? 'input-error' : ''}`}
                  name="name"
                  value={name}
                  onChange={handleNameChange}
                  autoComplete="name"
                  required
                />
                {fieldErrors.name && (
                  <div className="auth-field-error">
                    <span>⚠</span>
                    <span>{fieldErrors.name}</span>
                  </div>
                )}
              </div>

              {/* Work Email */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Work email
                </label>
                <input
                  id="reg-email"
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

              {/* Password with Show/Hide Toggle */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="reg-pw"
                    className={`auth-input-field ${fieldErrors.password ? 'input-error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={handlePasswordChange}
                    minLength={8}
                    autoComplete="new-password"
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
                {submitting ? 'Creating Account…' : 'Create Account'}
              </motion.button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12.5px', color: '#71717A' }}>
              Already registered?{' '}
              <Link to="/login" style={{ color: '#FFFFFF', fontWeight: '500' }}>
                Sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Register;
