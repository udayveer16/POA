'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import UserNav from '@/components/UserNav';
import ComplianceFooter from '@/components/ComplianceFooter';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs font-bold tracking-widest uppercase w-44 flex-shrink-0 mb-1 sm:mb-0"
        style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

// ── Delete Account Modal ──────────────────────────────────────────────────────
function DeleteAccountModal({ user, onClose, onDeleted }: {
  user: { email: string; phone: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<'confirm' | 'otp'>('confirm');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const identifier = identifierType === 'email' ? user.email : user.phone;

  const handleSendOtp = async () => {
    setSendingOtp(true); setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, type: identifierType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleDelete = async () => {
    if (!otp.trim()) { setError('Please enter the OTP.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: otp, identifier, identifierType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDeleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deletion failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: '4px', background: '#ef4444' }} />
        <div className="p-6">
          {step === 'confirm' && (
            <>
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Delete Your Account</h3>
                <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                  This will permanently delete your account, all attendance tokens, and all personal data. This action cannot be undone.
                </p>
              </div>
              <div className="mb-4">
                <label className="form-label">Verify identity via</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['email', 'phone'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => setIdentifierType(t)}
                      className="py-2.5 rounded-lg text-sm font-medium border-2 transition-all"
                      style={{
                        borderColor: identifierType === t ? '#ef4444' : 'var(--border)',
                        background: identifierType === t ? '#fef2f2' : 'white',
                        color: identifierType === t ? '#b91c1c' : 'var(--ink)',
                      }}>
                      {t === 'email' ? `✉️ ${user.email}` : `📱 ${user.phone}`}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="rounded-lg px-4 py-3 text-sm mb-4"
                  style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                  ⚠️ {error}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--ink)' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSendOtp} disabled={sendingOtp}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#ef4444' }}>
                  {sendingOtp ? 'Sending...' : 'Send OTP to Confirm'}
                </button>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">🔐</div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Enter OTP to Confirm</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Sent to <strong>{identifier}</strong></p>
              </div>
              <div className="mb-4">
                <label className="form-label">6-digit OTP</label>
                <input type="text" inputMode="numeric" maxLength={6} className="form-input text-center tracking-widest text-lg font-bold"
                  placeholder="••••••" value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }} autoFocus />
              </div>
              {error && (
                <div className="rounded-lg px-4 py-3 text-sm mb-4"
                  style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                  ⚠️ {error}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('confirm'); setOtp(''); setError(''); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--ink)' }}>
                  Back
                </button>
                <button type="button" onClick={handleDelete} disabled={loading || otp.length < 6}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#ef4444', opacity: (loading || otp.length < 6) ? 0.6 : 1 }}>
                  {loading ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const [showDelete, setShowDelete] = useState(false);

  const handleDeleted = () => {
    window.location.href = '/account-deleted';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="text-center" style={{ color: 'var(--muted)' }}>
          <div className="spinner inline-block" style={{ borderTopColor: 'var(--accent)', borderColor: 'var(--border)', width: 28, height: 28 }} />
          <p className="mt-3 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const consentDate = user.consentGivenAt
    ? new Date(user.consentGivenAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const lastLoginDate = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'First session';
  const retentionDate = new Date(user.lastLoginAt || user.createdAt);
  retentionDate.setFullYear(retentionDate.getFullYear() + 2);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
      {showDelete && (
        <DeleteAccountModal
          user={{ email: user.email, phone: user.phone }}
          onClose={() => setShowDelete(false)}
          onDeleted={handleDeleted}
        />
      )}

      <UserNav user={user} onLogout={logout} />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <h1 className="serif text-3xl" style={{ color: 'var(--ink)' }}>My Profile</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Your account details and data rights</p>
        </div>

        {/* Avatar card */}
        <div className="rounded-2xl overflow-hidden shadow-sm mb-4"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <div style={{ height: '4px', background: 'var(--accent)' }} />
          <div className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ background: 'var(--accent)' }}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>{user.fullName}</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Registered on {joinedDate}</p>
            </div>
          </div>
        </div>

        {/* Contact info — Right to Access */}
        <div className="rounded-2xl overflow-hidden shadow-sm mb-4"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Contact Information</p>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--cream)', color: 'var(--muted)' }}>🔒 Read only</span>
          </div>
          <div className="px-6">
            <InfoRow label="Full Name" value={user.fullName} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Last Login" value={lastLoginDate} />
          </div>
        </div>

        {/* Consent & data info */}
        <div className="rounded-2xl overflow-hidden shadow-sm mb-4"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Data & Consent</p>
          </div>
          <div className="px-6">
            <InfoRow label="Consent Given" value={consentDate} />
            <InfoRow label="Policy Version" value={user.policyVersion || 'v1.0'} />
            <InfoRow label="Data Retained Until" value={retentionDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
          </div>
        </div>

        {/* User rights */}
        <div className="rounded-2xl overflow-hidden shadow-sm mb-6"
          style={{ background: 'white', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Your Data Rights</p>
          </div>
          <div className="p-6 space-y-4">

            {/* Right to Access — already shown above */}
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">📋</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Right to Access</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  All data stored about you is displayed on this page. Your attendance tokens are visible on your dashboard.
                </p>
              </div>
            </div>

            {/* Right to Correction */}
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">✏️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Right to Correction</p>
                <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--muted)' }}>
                  If any of your details are incorrect, contact our Grievance Officer to request a correction.
                </p>
                <a href={`mailto:grievance@yourdomain.com?subject=Data Correction Request&body=Name: ${user.fullName}%0AEmail: ${user.email}%0APhone: ${user.phone}%0A%0APlease correct the following:%0A`}
                  className="inline-block text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--border)' }}>
                  ✉️ Request a Correction
                </a>
              </div>
            </div>

            {/* Right to Erasure */}
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">🗑️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: '#b91c1c' }}>Right to Erasure</p>
                <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--muted)' }}>
                  Permanently delete your account and all associated data including attendance tokens. This cannot be undone.
                </p>
                <button type="button" onClick={() => setShowDelete(true)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                  style={{ background: '#ef4444' }}>
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ComplianceFooter className="pb-6" />
    </div>
  );
}