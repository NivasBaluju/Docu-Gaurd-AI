import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';

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
            <p>Legal intelligence that protects your firm as fiercely as you protect your clients.</p>
            <div className="auth-visual-rule" />
            <div className="auth-trust-pills">
              <span className="auth-pill">AES-256-GCM</span>
              <span className="auth-pill">Zero-Trust</span>
              <span className="auth-pill">GDPR Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-form-card fade-up">
          <p className="auth-step-label">New account</p>
          <h2 className="auth-form-title">Create your account</h2>
          <p className="auth-form-sub">Start your free trial. No credit card required.</p>
          <form id="regForm" className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="reg-email">Work email</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@lawfirm.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="reg-pw">Password</label>
              <input
                id="reg-pw"
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
            <button className="btn-auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
