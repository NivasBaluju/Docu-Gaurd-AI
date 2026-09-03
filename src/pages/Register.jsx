import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Api from '../services/api';
import { useToast } from '../context/ToastContext';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';

/**
 * Register — Enterprise Account Registration
 * Paper & Ink monochrome styling, underline inputs,
 * preserving all registration contracts and validation.
 */
export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
  };

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
    setFieldErrors({ name: '', email: '', password: '' });

    let hasErr = false;
    if (!name.trim()) {
      setFieldErrors((prev) => ({ ...prev, name: 'Please enter your full name' }));
      hasErr = true;
    }
    if (!email.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: 'Please enter your work email' }));
      hasErr = true;
    }
    if (!password || password.length < 8) {
      setFieldErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }));
      hasErr = true;
    }
    if (hasErr) return;

    setSubmitting(true);
    try {
      await Api.post('/api/auth/register', { name, email, password });
      toast('Account created — please sign in', 'ok');
      navigate('/login');
    } catch (err) {
      const errMsg = err.message || 'Registration failed';
      if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('exists')) {
        setFieldErrors({ name: '', email: 'An account with this email already exists', password: '' });
      } else {
        setFieldErrors({ name: '', email: '', password: errMsg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] bg-paper flex items-center justify-center py-20 px-6">
      <div className="max-w-md w-full bg-paper-dim border border-rule p-8 sm:p-12">
        <div className="text-center mb-10 pb-6 border-b border-rule">
          <span className="font-body text-micro text-neutral-500 block mb-2 select-none">
            [ENTERPRISE REGISTRATION]
          </span>
          <h1 className="display-03 text-ink tracking-tight mb-2">
            Create Account
          </h1>
          <p className="font-body text-body-sm text-ink-soft">
            Register your enterprise account to access legal copilot capabilities.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="name"
            label="Full Name & Title"
            required
            value={name}
            onChange={handleNameChange}
            error={fieldErrors.name}
            placeholder="e.g. David Vance, Managing Counsel"
          />

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
            label="Password (min. 8 characters)"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={handlePasswordChange}
            error={fieldErrors.password}
            placeholder="••••••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting}
            className="w-full mt-4 mb-6"
          >
            Register Account
          </Button>

          <div className="text-center pt-6 border-t border-rule text-body-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="editorial-link text-ink font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
