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
                [ZERO-TRUST_SECURITY]
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em', color: '#FFFFFF', margin: '4px 0 2px' }}>
                Two-Factor Auth
              </h1>
              <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                Enter the 6-digit code from your authenticator
              </p>
            </div>

            <form id="totpForm" onSubmit={handleTotpSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                  Authenticator Passcode
                </label>
                <input
                  id="mfa-code"
                  name="code"
                  maxLength={6}
                  inputMode="numeric"
                  required
                  autoFocus
                  placeholder="000000"
                  className="auth-input-field"
                  style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '18px', fontWeight: '700' }}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </div>

              <motion.button
                className="auth-btn-action"
                type="submit"
                disabled={submitting}
                {...buttonMotion}
              >
                {submitting ? 'Verifying…' : 'Verify & Authorize'}
              </motion.button>
            </form>

            <motion.button
              className="btn btn-outline btn-block mt-12"
              id="reqOtpBtn"
              style={{ borderRadius: '8px', padding: '9px', fontSize: '13px', marginTop: '10px' }}
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
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '5px' }}>
                        Email OTP Code{' '}
                        {devModeInfo && <span className="badge badge-warn">DEV: {devModeInfo}</span>}
                      </label>
                      <input
                        name="code"
                        maxLength={6}
                        inputMode="numeric"
                        required
                        placeholder="000000"
                        className="auth-input-field"
                        style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '18px', fontWeight: '700' }}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                      />
                    </div>
                    <motion.button
                      className="auth-btn-action"
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
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Mfa;
