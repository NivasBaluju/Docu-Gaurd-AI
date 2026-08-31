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
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await Api.post('/api/auth/register', { name, email, password });
      toast('Account created — please sign in', 'ok');
      navigate('/login');
    } catch (err) {
      toast(err.message || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
                Establish Firm Vault
              </h1>
              <p style={{ fontSize: '14px', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
                Initialize your Zero-Trust encrypted legal intelligence workspace.
              </p>
            </div>

            <form id="regForm" onSubmit={handleSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Full name / Senior Counsel
                </label>
                <input
                  id="reg-name"
                  className="dark-input-field"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith, Esq."
                  autoComplete="name"
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Institutional work email
                </label>
                <input
                  id="reg-email"
                  className="dark-input-field"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@lawfirm.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#A1A1AA', marginBottom: '6px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Master passphrase
                </label>
                <input
                  id="reg-pw"
                  className="dark-input-field"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>

              <motion.button
                className="dark-btn-action"
                type="submit"
                disabled={submitting}
                {...buttonMotion}
              >
                {submitting ? 'Provisioning Vault…' : 'Create Firm Workspace'}
              </motion.button>
            </form>

            <div style={{ marginTop: '28px', fontSize: '13px', color: '#71717A' }}>
              Already registered?{' '}
              <Link to="/login" style={{ color: '#FFFFFF', fontWeight: '600', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                Sign in to chamber
              </Link>
            </div>

            {/* Monospace Trust Badges */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <span className="mono" style={{ fontSize: '11px', color: '#52525B' }}>
                [HARDWARE_MFA_READY]
              </span>
              <span className="mono" style={{ fontSize: '11px', color: '#52525B' }}>
                [AES-256-GCM]
              </span>
              <span className="mono" style={{ fontSize: '11px', color: '#52525B' }}>
                [GDPR_COMPLIANT]
              </span>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Dithered Lady Justice Holding Scales of Justice */}
        <div className="dark-art-display-side">
          <img
            src="/assets/lady-justice.jpg"
            alt="Lady Justice Marble Statue Dither Art"
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
              Truth · Balance · Equity
            </p>
            <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0, fontStyle: 'italic' }}>
              "Fiat justitia ruat caelum — Let justice be done though the heavens fall."
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Register;
