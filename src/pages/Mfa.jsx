import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';
import PageTransition from '../components/common/PageTransition';
import { buttonMotion, EASE_OUT } from '../styles/motion';

export const Mfa = () => {
  const [totpCode, setTotpCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devModeInfo, setDevModeInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const preToken = sessionStorage.getItem('preToken');

  useEffect(() => {
    if (!preToken) {
      navigate('/login', { replace: true });
    }
  }, [preToken, navigate]);

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    if (!preToken) return;
    setSubmitting(true);
    try {
      const result = await Api.post('/api/auth/mfa/totp/verify', { preToken, code: totpCode });
      sessionStorage.removeItem('preToken');
      await login(result.token, result.user);
      toast('MFA verified — signed in', 'ok');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'Verification failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!preToken) return;
    try {
      const r = await Api.post('/api/auth/mfa/otp/request', { preToken });
      setOtpSent(true);
      if (r.devMode) {
        setDevModeInfo(r.devCode);
      }
      toast(r.devMode ? 'Dev mode: OTP shown on screen' : 'OTP sent to your email', 'info');
    } catch (err) {
      toast(err.message || 'Failed to request OTP', 'error');
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!preToken) return;
    setSubmitting(true);
    try {
      const result = await Api.post('/api/auth/mfa/otp/verify', { preToken, code: otpCode });
      sessionStorage.removeItem('preToken');
      await login(result.token, result.user);
      toast('MFA verified — signed in', 'ok');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'OTP verification failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!preToken) return null;

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
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
              <Icon.lock />
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
              Zero-Trust Verification
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.03em', color: '#1D1D1F', margin: '4px 0 6px' }}>
              Two-Factor Auth
            </h1>
            <p style={{ fontSize: '13.5px', color: '#6E6E73', margin: 0 }}>
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <form id="totpForm" onSubmit={handleTotpSubmit}>
            <div className="glass-input-group">
              <label htmlFor="mfa-code">Authenticator Code</label>
              <input
                id="mfa-code"
                name="code"
                maxLength={6}
                inputMode="numeric"
                required
                autoFocus
                placeholder="000000"
                className="glass-input"
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: '700' }}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
            </div>
            <motion.button
              className="glass-btn-submit"
              type="submit"
              disabled={submitting}
              {...buttonMotion}
            >
              {submitting ? 'Verifying…' : 'Verify & Sign In'}
            </motion.button>
          </form>

          <motion.button
            className="btn btn-outline btn-block mt-12"
            id="reqOtpBtn"
            style={{ borderRadius: 'var(--radius-pill)', padding: '10px' }}
            onClick={handleRequestOtp}
            type="button"
            {...buttonMotion}
          >
            <Icon.chat /> Send Email OTP instead
          </motion.button>

          <AnimatePresence>
            {otpSent && (
              <motion.div
                id="otpArea"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
              >
                <form id="otpForm" className="mt-16" onSubmit={handleOtpSubmit}>
                  <div className="glass-input-group">
                    <label>
                      Email OTP{' '}
                      {devModeInfo && <span className="badge badge-warn">DEV: {devModeInfo}</span>}
                    </label>
                    <input
                      name="code"
                      maxLength={6}
                      inputMode="numeric"
                      required
                      placeholder="000000"
                      className="glass-input"
                      style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: '700' }}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                  <motion.button
                    className="glass-btn-submit"
                    type="submit"
                    disabled={submitting}
                    {...buttonMotion}
                  >
                    {submitting ? 'Verifying OTP…' : 'Verify OTP'}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Mfa;
