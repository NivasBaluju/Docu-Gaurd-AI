import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await Api.post('/api/auth/login', { email, password });
      if (result.mfaRequired) {
        sessionStorage.setItem('preToken', result.preToken);
        navigate('/mfa');
        return;
      }
      await login(result.token, result.user);
      toast('Signed in securely', 'ok');
      navigate('/dashboard');
    } catch (err) {
      toast(err.message || 'Login failed', 'error');
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
            <p>The gold standard in AI-powered legal document intelligence.</p>
            <div className="auth-visual-rule" />
            <div className="auth-trust-pills">
              <span className="auth-pill">Zero-Trust</span>
              <span className="auth-pill">MFA Ready</span>
              <span className="auth-pill">Audit Ledger</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-form-card fade-up">
          <p className="auth-step-label">Welcome back</p>
          <h2 className="auth-form-title">Sign in</h2>
          <p className="auth-form-sub">Access your encrypted legal workspace.</p>
          <form id="loginForm" className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
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
              <label htmlFor="login-pw">Password</label>
              <input
                id="login-pw"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn-auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Signing In…' : 'Sign In Securely'}
            </button>
          </form>
          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
