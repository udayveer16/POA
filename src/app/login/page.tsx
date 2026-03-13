'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ComplianceFooter from '@/components/ComplianceFooter';
import Image from 'next/image';

type Step = 'choose' | 'enter' | 'otp';
type LoginType = 'email' | 'phone';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/user/dashboard';

  const [step, setStep] = useState<Step>('choose');
  const [loginType, setLoginType] = useState<LoginType>('email');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (r.ok) router.replace(redirectTo); });
  }, [router, redirectTo]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!identifier.trim()) { setError(`Please enter your ${loginType}.`); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), type: loginType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('otp');
      setResendCountdown(60);
      if (data._dev_otp) setDevOtp(data._dev_otp);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) { setOtp(paste.split('')); otpRefs.current[5]?.focus(); }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit OTP.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), type: loginType, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-pattern min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image src="/logo.png" alt="Presque Vu" width={160} height={58} priority style={{ objectFit: 'contain' }} />
          </div>
          <h2 className="serif text-2xl" style={{ color: 'var(--ink)' }}>Welcome Back</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Login with your registered email or phone</p>
        </div>

        <div className="rounded-2xl shadow-lg overflow-hidden card-enter"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <div style={{ height: '4px', background: 'var(--accent)' }} />
          <div className="p-6 md:p-8">

            {step === 'choose' && (
              <div className="space-y-4">
                <p className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: 'var(--gold)' }}>
                  Choose Login Method
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(['email', 'phone'] as LoginType[]).map(t => (
                    <button key={t} type="button"
                      onClick={() => { setLoginType(t); setStep('enter'); setError(''); }}
                      className="py-5 rounded-xl flex flex-col items-center gap-2 transition-all border-2"
                      style={{ border: '2px solid var(--border)', background: 'white', color: 'var(--ink)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <span className="text-3xl">{t === 'email' ? '✉️' : '📱'}</span>
                      <span className="text-sm font-semibold capitalize">{t}</span>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>OTP to {t}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
                  No account?{' '}
                  <a href="/" className="underline" style={{ color: 'var(--accent)' }}>Register here</a>
                </p>
              </div>
            )}

            {step === 'enter' && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" onClick={() => { setStep('choose'); setError(''); }}
                    className="text-sm hover:underline" style={{ color: 'var(--muted)' }}>← Back</button>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
                    Enter Your {loginType === 'email' ? 'Email' : 'Phone'}
                  </p>
                </div>
                <div>
                  <label className="form-label">{loginType === 'email' ? 'Email Address' : 'Phone Number'}</label>
                  <input type={loginType === 'email' ? 'email' : 'tel'} className="form-input"
                    placeholder={loginType === 'email' ? 'you@example.com' : '+91 98765 43210'}
                    value={identifier} onChange={e => { setIdentifier(e.target.value); setError(''); }}
                    autoFocus required />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>Must match your registered {loginType}</p>
                </div>
                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm"
                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>⚠️ {error}</div>
                )}
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? <><span className="spinner" />Sending OTP...</> : `Send OTP via ${loginType}`}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" onClick={() => { setStep('enter'); setOtp(['','','','','','']); setError(''); }}
                    className="text-sm hover:underline" style={{ color: 'var(--muted)' }}>← Back</button>
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Verify OTP</p>
                </div>
                <div className="text-center">
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>OTP sent to <strong>{identifier}</strong></p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Valid for 10 minutes</p>
                </div>
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-11 text-center text-xl font-bold rounded-lg border-2 outline-none transition-all"
                      style={{ height: '52px', borderColor: digit ? 'var(--accent)' : 'var(--border)',
                        color: 'var(--ink)', background: digit ? 'var(--accent-light)' : 'white' }} />
                  ))}
                </div>
                {devOtp && (
                  <div className="rounded-lg px-4 py-2.5 text-center text-sm"
                    style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' }}>
                    🧪 Dev mode — OTP: <strong className="font-mono tracking-widest">{devOtp}</strong>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm"
                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>⚠️ {error}</div>
                )}
                <button type="submit" className="btn-submit" disabled={loading || otp.join('').length < 6}>
                  {loading ? <><span className="spinner" />Verifying...</> : 'Verify & Login'}
                </button>
                <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
                  Didn&apos;t receive it?{' '}
                  {resendCountdown > 0 ? <span>Resend in {resendCountdown}s</span> : (
                    <button type="button" onClick={() => handleSendOtp()}
                      className="underline" style={{ color: 'var(--accent)' }}>Resend OTP</button>
                  )}
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