import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/common/PageTransition';
import { buttonMotion } from '../styles/motion';

export const Mfa = () => {
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const preToken = sessionStorage.getItem('preToken');

  // Auto-request OTP when landing on the page
  useEffect(() => {
    if (!preToken) {
      navigate('/login', { replace: true });
      return;
    }

    let isMounted = true;
    async function initOtp() {
      try {
        const r = await Api.post('/api/auth/mfa/otp/request', { preToken });
        if (isMounted && r.devMode) {
          setDevCode(r.devCode);
        }
      } catch (err) {
        console.warn('Initial OTP request note:', err.message);
      }
    }
    initOtp();

    return () => {
      isMounted = false;
    };
  }, [preToken, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCodeChange = (e) => {
    setOtpCode(e.target.value);
    if (otpError) setOtpError('');
  };

  const handleRequestOtp = async () => {
    if (!preToken || resendCooldown > 0) return;
    setRequesting(true);
    setOtpError('');
    try {
      const r = await Api.post('/api/auth/mfa/otp/request', { preToken });
      if (r.devMode) {
        setDevCode(r.devCode);
      }
      setResendCooldown(30);
      toast(r.devMode ? 'Dev mode: New code generated' : 'Verification code sent to your email', 'info');
    } catch (err) {
      setOtpError(err.message || 'Failed to request new code');
    } finally {
      setRequesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preToken) return;

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setOtpError('Please enter the 6-digit verification code');
      return;
    }

    setSubmitting(true);
    setOtpError('');
    try {
      const result = await Api.post('/api/auth/mfa/otp/verify', { preToken, code: otpCode.trim() });
      sessionStorage.removeItem('preToken');
      await login(result.token, result.user);
      toast('Identity verified — signed in', 'ok');
      navigate('/dashboard');
    } catch (err) {
      setOtpError('Incorrect or expired verification code. Please check your email or request a new code.');
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
                [EMAIL_VERIFICATION]
              </span>
              <h1 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em', color: '#FFFFFF', margin: '4px 0 2px' }}>
                Security Verification
              </h1>
              <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                Enter the 6-digit code sent to your registered email
              </p>
              {devCode && (
                <div style={{ marginTop: '8px' }}>
                  <span className="badge badge-warn" style={{ fontSize: '11px' }}>
                    DEV CODE: {devCode}
                  </span>
                </div>
              )}
            </div>

            <form id="otpForm" onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px' }}>
                  Verification Code
                </label>
                <input
                  id="mfa-otp-code"
                  name="code"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  required
                  className={`auth-input-field ${otpError ? 'input-error' : ''}`}
                  style={{
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontSize: '20px',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)'
                  }}
                  value={otpCode}
                  onChange={handleCodeChange}
                />
                {otpError && (
                  <div className="auth-field-error" style={{ justifyContent: 'center', textAlign: 'center' }}>
                    <span>⚠</span>
                    <span>{otpError}</span>
                  </div>
                )}
              </div>

              <motion.button
                className="auth-btn-action"
                type="submit"
                disabled={submitting}
                {...buttonMotion}
              >
                {submitting ? 'Verifying Code…' : 'Verify & Sign In'}
              </motion.button>
            </form>

            {/* Resend Code Action */}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRequestOtp}
                disabled={requesting || resendCooldown > 0}
                style={{ fontSize: '12px', color: resendCooldown > 0 ? '#71717A' : '#A1A1AA' }}
              >
                {requesting
                  ? 'Sending code…'
                  : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : 'Didn’t receive code? Resend email'}
              </button>
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
              <span>Zero-Trust One-Time Password Enforcement</span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Mfa;
