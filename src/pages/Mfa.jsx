import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import AuthThresholdModal from '../components/common/AuthThresholdModal';
import MetalFx from '../components/ui/MetalFx';

/**
 * Mfa — The Threshold Crossing Entry
 * Incorporates the Paper & Ink editorial design system and the
 * AuthThresholdModal transition upon successful OTP verification.
 */
export function Mfa() {
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Threshold modal states
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [thresholdStatus, setThresholdStatus] = useState('validating');
  const [authPayload, setAuthPayload] = useState(null);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const preToken = sessionStorage.getItem('preToken');
  const authEmail = sessionStorage.getItem('authEmail');

  useEffect(() => {
    if (!preToken) {
      navigate('/login', { replace: true });
    }
  }, [preToken, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(val);
    if (otpError) setOtpError('');
  };

  const handleRequestOtp = async () => {
    if (!preToken || resendCooldown > 0) return;
    setRequesting(true);
    setOtpError('');
    try {
      await Api.post('/api/auth/mfa/otp/request', { preToken });
      setResendCooldown(30);
      toast('A new verification code was dispatched to your email', 'ok');
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
      setOtpError('Please enter the complete 6-digit verification pass');
      return;
    }

    setSubmitting(true);
    setOtpError('');

    try {
      const result = await Api.post('/api/auth/mfa/otp/verify', { preToken, code: otpCode.trim() });
      setAuthPayload(result);
      setThresholdOpen(true);
      setThresholdStatus('confirmed');
    } catch (err) {
      setOtpError('Incorrect or expired verification code. Please check your email or request a new code.');
      setSubmitting(false);
    }
  };

  const handleThresholdComplete = async () => {
    if (!authPayload) return;
    sessionStorage.removeItem('preToken');
    sessionStorage.removeItem('authEmail');
    await login(authPayload.token, authPayload.user);
    toast('Identity confirmed — workspace initialized', 'ok');
    navigate('/dashboard');
  };

  if (!preToken) return null;

  return (
    <div className="w-full min-h-[85vh] bg-paper flex items-center justify-center py-20 px-6">
      <div 
        className="w-full bg-paper-dim border border-rule p-8 sm:p-12 mx-auto"
        style={{ maxWidth: '480px' }}
      >
        <div className="text-center mb-10 pb-6 border-b border-rule">
          <span className="font-body text-micro text-neutral-500 block mb-2 select-none tracking-widest uppercase">
            [Zero-Trust Verification]
          </span>
          <h1 className="font-display text-4xl text-ink tracking-tight mb-3">
            Security Pass
          </h1>
          <p className="font-body text-body-sm text-ink-soft max-w-sm mx-auto">
            Enter the 6-digit one-time passcode dispatched to{' '}
            <span className="text-ink font-medium">{authEmail || 'your email'}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="w-full">
          <div className="mb-8">
            <label htmlFor="otpCode" className="block font-body text-label text-ink-soft mb-2 text-center">
              One-Time Passcode
            </label>
            <input
              id="otpCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={otpCode}
              onChange={handleCodeChange}
              placeholder="000000"
              className="w-full bg-paper border-0 border-b-2 border-rule focus:border-ink px-4 py-4 text-center font-display text-3xl tracking-widest text-ink outline-none transition-colors duration-instant"
            />
            {otpError && (
              <p role="alert" className="mt-3 font-body text-body-sm text-ink text-center font-medium">
                {otpError}
              </p>
            )}
          </div>

          <div className="mt-8 mb-6">
            <MetalFx preset="chromatic" strength={0.90} className="w-full">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={otpCode.length < 6 || submitting}
                className="w-full py-4 text-center font-medium"
              >
                Verify &amp; Enter Cockpit
              </Button>
            </MetalFx>
          </div>

          <div className="text-center pt-4 border-t border-rule">
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={requesting || resendCooldown > 0}
              className="font-body text-body-sm text-ink-soft hover:text-ink transition-colors disabled:opacity-40"
            >
              {requesting
                ? 'Dispatching code...'
                : resendCooldown > 0
                ? `Request new code in ${resendCooldown}s`
                : 'Resend verification code'}
            </button>
          </div>
        </form>
      </div>

      {/* The Threshold Transition Modal */}
      <AuthThresholdModal
        isOpen={thresholdOpen}
        status={thresholdStatus}
        email={authPayload?.user?.email}
        onComplete={handleThresholdComplete}
      />
    </div>
  );
}

export default Mfa;
