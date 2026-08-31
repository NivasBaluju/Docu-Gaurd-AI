import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';

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
    <div className="auth-cinematic">
      <div className="auth-visual">
        <div className="auth-visual-inner">
          <div className="auth-visual-logo">
            <div className="avc-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="22" height="22">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="avc-brand">Docu-Gaurd AI</span>
          </div>
          <div className="auth-visual-quote">
            <div className="auth-visual-mark">"</div>
            <p>Two-factor verification active for zero-trust enterprise security.</p>
            <div className="auth-visual-rule" />
            <div className="auth-trust-pills">
              <span className="auth-pill">TOTP MFA</span>
              <span className="auth-pill">AES-256-GCM</span>
              <span className="auth-pill">Zero-Trust</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-form-card fade-up">
          <p className="auth-step-label">Verification</p>
          <h2 className="auth-form-title">Two-Factor Authentication</h2>
          <p className="auth-form-sub">Enter the 6-digit code from your authenticator app.</p>

          <form id="totpForm" className="auth-form" onSubmit={handleTotpSubmit}>
            <div className="input-group">
              <label htmlFor="mfa-code">Authenticator Code</label>
              <input
                id="mfa-code"
                name="code"
                maxLength={6}
                inputMode="numeric"
                required
                autoFocus
                placeholder="000000"
                className="mfa-code-input"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
            </div>
            <button className="btn-auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify & Sign In'}
            </button>
          </form>

          <button
            className="btn btn-outline btn-block mt-12"
            id="reqOtpBtn"
            style={{ borderRadius: 'var(--radius)', padding: '12px' }}
            onClick={handleRequestOtp}
            type="button"
          >
            <Icon.chat /> Send Email OTP instead
          </button>

          {otpSent && (
            <div id="otpArea">
              <form id="otpForm" className="mt-16 auth-form" onSubmit={handleOtpSubmit}>
                <div className="input-group">
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
                    className="mfa-code-input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
                <button className="btn-auth-submit" type="submit" disabled={submitting}>
                  {submitting ? 'Verifying OTP…' : 'Verify OTP'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mfa;
