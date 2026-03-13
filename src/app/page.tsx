'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ComplianceFooter from '@/components/ComplianceFooter';
import Image from 'next/image';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Home() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '' });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ id: number; userId: string } | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({});
  const [checking, setChecking] = useState<{ email?: boolean; phone?: boolean }>({});

  const debouncedEmail = useDebounce(form.email, 600);
  const debouncedPhone = useDebounce(form.phone, 600);

  useEffect(() => {
    if (!debouncedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail)) {
      setFieldErrors(prev => ({ ...prev, email: undefined }));
      return;
    }
    setChecking(prev => ({ ...prev, email: true }));
    fetch(`/api/check-duplicate?email=${encodeURIComponent(debouncedEmail)}`)
      .then(r => r.json())
      .then(data => setFieldErrors(prev => ({
        ...prev, email: data.exists ? 'This email is already registered.' : undefined,
      })))
      .finally(() => setChecking(prev => ({ ...prev, email: false })));
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedPhone || debouncedPhone.length < 8) {
      setFieldErrors(prev => ({ ...prev, phone: undefined }));
      return;
    }
    setChecking(prev => ({ ...prev, phone: true }));
    fetch(`/api/check-duplicate?phone=${encodeURIComponent(debouncedPhone)}`)
      .then(r => r.json())
      .then(data => setFieldErrors(prev => ({
        ...prev, phone: data.exists ? 'This phone number is already registered.' : undefined,
      })))
      .finally(() => setChecking(prev => ({ ...prev, phone: false })));
  }, [debouncedPhone]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.fullName || !form.email || !form.phone) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!consent) {
      setError('You must accept the Privacy Policy and Terms of Service to register.');
      return;
    }
    if (fieldErrors.email || fieldErrors.phone) {
      setError('Please fix the errors above before submitting.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, phone: form.phone, consentGiven: consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      setSuccess({ id: data.data.id, userId: data.data.userId });
      setForm({ fullName: '', email: '', phone: '' });
      setConsent(false);
      setFieldErrors({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-pattern min-h-screen flex flex-col py-8 px-4">
      <div className="flex-1">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-5">
            <Image src="/logo.png" alt="PV" width={200} height={200} priority style={{ objectFit: 'contain' }} />
            {/* <div className="text-left leading-tight">
              <div className="serif text-3xl" style={{ color: 'var(--ink)' }}>Presque</div>
              <div className="serif text-3xl" style={{ color: 'var(--accent)' }}>Vu</div>
            </div> */}
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Create your account to receive attendance tokens</p>
          <a href="/login" className="inline-block mt-3 text-xs underline" style={{ color: 'var(--muted)' }}>
            Already registered? Login →
          </a>
        </div>

        {/* Card */}
        <div className="card-enter max-w-lg mx-auto rounded-2xl shadow-lg overflow-hidden"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <div style={{ height: '4px', background: 'var(--accent)' }} />
          <div className="p-6 md:p-8">

            {/* Success */}
            {success && (
              <div className="success-msg mb-6 rounded-xl p-5 text-center"
                style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-green-800 text-lg">Registration Successful!</p>
                <p className="text-green-700 text-sm mt-1">Reference ID: <strong>#{success.id}</strong></p>
                <div className="mt-5 pt-4 border-t" style={{ borderColor: '#86efac' }}>
                  <p className="text-sm font-semibold text-green-800 mb-3">Now login to your account</p>
                  <a href="/login"
                    className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'var(--accent)' }}>
                    Login with OTP →
                  </a>
                  <p className="text-xs mt-3 text-green-600">Use the email or phone you just registered</p>
                </div>
                <button type="button" className="mt-4 text-xs underline text-green-600"
                  onClick={() => setSuccess(null)}>
                  Register another account
                </button>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--gold)' }}>
                  Personal Information
                </p>

                {/* Full Name */}
                <div>
                  <label className="form-label" htmlFor="fullName">
                    Full Name <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input id="fullName" name="fullName" type="text" className="form-input"
                    placeholder="Your full name" value={form.fullName} onChange={handleChange} required />
                </div>

                {/* Email */}
                <div>
                  <label className="form-label" htmlFor="email">
                    Email Address <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input id="email" name="email" type="email"
                      className={`form-input ${fieldErrors.email ? 'border-red-400' : ''}`}
                      placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                    {checking.email && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--muted)' }}>
                        Checking...
                      </span>
                    )}
                  </div>
                  {fieldErrors.email && <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>⚠️ {fieldErrors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="form-label" htmlFor="phone">
                    Phone Number <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <div className="relative">
                    <input id="phone" name="phone" type="tel"
                      className={`form-input ${fieldErrors.phone ? 'border-red-400' : ''}`}
                      placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} required />
                    {checking.phone && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--muted)' }}>
                        Checking...
                      </span>
                    )}
                  </div>
                  {fieldErrors.phone && <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>⚠️ {fieldErrors.phone}</p>}
                </div>

                {/* Consent checkbox */}
                <div className="rounded-xl p-4" style={{ background: 'var(--cream)', border: '1px solid var(--border)' }}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 flex-shrink-0"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--ink)' }}>
                      I have read and agree to the{' '}
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer"
                        className="underline font-medium" style={{ color: 'var(--accent)' }}>
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="/terms-of-service" target="_blank" rel="noopener noreferrer"
                        className="underline font-medium" style={{ color: 'var(--accent)' }}>
                        Terms of Service
                      </a>
                      . I consent to the collection and use of my name, email, and phone number for account creation and attendance tracking. My data will be retained for up to 2 years from my last login.
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm"
                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" className="btn-submit"
                  disabled={loading || !!fieldErrors.email || !!fieldErrors.phone || !consent}>
                  {loading ? <><span className="spinner" />Registering...</> : 'Create Account'}
                </button>

                <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
                  🔒 Your data is stored securely and never sold to third parties
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <ComplianceFooter className="mt-8" />
    </div>
  );
}