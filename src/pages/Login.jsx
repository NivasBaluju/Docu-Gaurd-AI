import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MetalFx from '../components/ui/MetalFx';

/**
 * Login — Client Portal Access
 * Restyled to Paper & Ink monochrome tokens with underline inputs.
 * Preserves 100% of authentication and MFA dispatch logic.
 */
export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ email: '', password: '' });

    if (!email) {
      setFieldErrors((prev) => ({ ...prev, email: 'Please enter your corporate email address' }));
      return;
    }
    if (!password) {
      setFieldErrors((prev) => ({ ...prev, password: 'Please enter your password' }));
      return;
    }

    setSubmitting(true);
    try {
      const result = await Api.post('/api/auth/login', { email, password });
      if (result.mfaRequired) {
        sessionStorage.setItem('preToken', result.preToken);
        if (result.devCode) sessionStorage.setItem('devCode', result.devCode);
        navigate('/mfa');
        return;
      }
      await login(result.token, result.user);
      toast('Signed in securely', 'ok');
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.message || 'Authentication failed';
      const lower = errMsg.toLowerCase();
      if (lower.includes('password') || lower.includes('credentials') || lower.includes('invalid email or password')) {
        setFieldErrors({ email: '', password: 'Incorrect credentials. Please try again.' });
      } else if (lower.includes('email') || lower.includes('account') || lower.includes('user not found')) {
        setFieldErrors({ email: errMsg, password: '' });
      } else {
        setFieldErrors({ email: '', password: errMsg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] bg-paper flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-paper p-8 sm:p-12 border border-rule shadow-none mx-auto">
        <div className="text-center mb-10 pb-6 border-b border-rule">
          <span className="font-body text-micro text-ink-soft block mb-2 select-none">
            [CLIENT PORTAL ACCESS]
          </span>
          <h1 className="display-03 text-ink tracking-tight mb-2">
            Sign In
          </h1>
          <p className="font-body text-body-sm text-ink-soft">
            Enter your credentials to access the DocuGuard executive cockpit.
          </p>
        </div>

        {/* Demo Fast-Login Helper */}
        <div className="mb-6 p-3.5 bg-paper-dim border border-rule flex items-center justify-between gap-3 text-left">
          <div>
            <span className="font-body text-micro text-ink font-semibold block">Demo Cockpit Access</span>
            <span className="font-body text-micro text-ink-soft select-all">admin@docugaurd.ai / Password123!</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@docugaurd.ai');
              setPassword('Password123!');
              setFieldErrors({ email: '', password: '' });
            }}
            className="btn btn-ghost py-1 px-3 text-micro whitespace-nowrap"
          >
            Auto-fill
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="email"
            label="Corporate Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={handleEmailChange}
            error={fieldErrors.email}
            placeholder="counsel@enterprise.com"
          />

          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={handlePasswordChange}
            error={fieldErrors.password}
            placeholder="••••••••••••"
          />

          <div className="mt-6 mb-6">
            <MetalFx preset="chromatic" strength={0.90} className="w-full">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={submitting}
                className="w-full"
              >
                Authenticate
              </Button>
            </MetalFx>
          </div>

          <div className="text-center pt-6 border-t border-rule text-body-sm text-ink-soft flex flex-col gap-2">
            <p className="m-0">
              New to DocuGuard?{' '}
              <Link to="/register" className="editorial-link text-ink font-medium">
                Register enterprise account
              </Link>
            </p>
            <p className="m-0 text-micro text-ink-soft">
              Protected by Zero-Trust hardware isolation
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
