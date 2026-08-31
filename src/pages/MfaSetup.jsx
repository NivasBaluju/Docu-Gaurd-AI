import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import Icon from '../components/common/Icon';

export const MfaSetup = () => {
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadMfaSetup() {
      try {
        const res = await Api.post('/api/auth/mfa/totp/setup');
        if (isMounted) setSetupData(res);
      } catch (err) {
        if (isMounted) toast(err.message || 'Failed to initialize MFA setup', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMfaSetup();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await Api.post('/api/auth/mfa/totp/enable', { code });
      toast('MFA enabled successfully', 'ok');
      navigate('/security');
    } catch (err) {
      toast(err.message || 'Failed to enable MFA', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!setupData) return null;

  return (
    <div>
      <h1 className="page-title">Enable Two-Factor Authentication</h1>
      <p className="page-sub">
        Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
      </p>

      <div className="card" style={{ maxWidth: '480px' }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src={setupData.qrDataUrl}
            alt="TOTP QR code"
            style={{
              width: '180px',
              borderRadius: '12px',
              margin: '8px auto 16px',
              display: 'block',
              border: '1px solid var(--border)'
            }}
          />
          <p className="text-mid small">Or enter manually:</p>
          <p className="mono bold" style={{ fontSize: '15px', marginTop: '4px' }}>
            {setupData.secret}
          </p>
        </div>

        <div className="divider" />

        <form id="enableForm" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="mfa-confirm-code">6-digit code from your authenticator app</label>
            <input
              id="mfa-confirm-code"
              name="code"
              maxLength={6}
              required
              placeholder="000000"
              className="mfa-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-block mt-8"
            type="submit"
            disabled={submitting}
            style={{ padding: '12px', borderRadius: 'var(--radius)' }}
          >
            <Icon.check /> {submitting ? 'Enabling…' : 'Enable MFA'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MfaSetup;
