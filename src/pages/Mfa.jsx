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
                Zero-Trust Verification
              </h1>
              <p style={{ fontSize: '14px', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
                Enter the 6-digit hardware verification code from your authenticator app.
              </p>
            </div>

            <form id="totpForm" onSubmit={handleTotpSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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
                  className="dark-input-field"
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '22px', fontWeight: '700' }}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </div>

              <motion.button
                className="dark-btn-action"
                type="submit"
                disabled={submitting}
                {...buttonMotion}
              >
                {submitting ? 'Verifying…' : 'Verify & Authorize Session'}
              </motion.button>
            </form>

            <motion.button
              className="btn btn-outline btn-block mt-12"
              id="reqOtpBtn"
              style={{ borderRadius: '10px', padding: '11px', fontSize: '13.5px', marginTop: '12px' }}
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
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px' }}>
                        Email OTP Code{' '}
                        {devModeInfo && <span className="badge badge-warn">DEV: {devModeInfo}</span>}
                      </label>
                      <input
                        name="code"
                        maxLength={6}
                        inputMode="numeric"
                        required
                        placeholder="000000"
                        className="dark-input-field"
                        style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontWeight: '700' }}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                      />
                    </div>
                    <motion.button
                      className="dark-btn-action"
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

        {/* Right Side: Classical Pillar Dither Art */}
        <div className="dark-art-display-side">
          <img
            src="/assets/justice-pillars.jpg"
            alt="Classical Roman Columns Dither Art"
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
              Zero-Trust Architecture · Chamber Security
            </p>
            <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0, fontStyle: 'italic' }}>
              "Integrity is doing the right thing, even when no one is watching."
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Mfa;
