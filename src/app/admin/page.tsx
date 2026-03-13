'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Submission = {
  id: number; user_id: string; full_name: string; email: string;
  phone: string; consent_given_at: string | null;
  policy_version: string | null; created_at: string; last_login_at: string | null;
};

type Event = {
  id: number; name: string; event_date: string; location: string | null;
  description: string | null; speaker: string | null; category: string | null;
  image_path: string | null; created_at: string; issued_count: number;
};

type UserRow = {
  user_id: string; full_name: string; email: string;
  phone: string; already_issued: boolean;
};

const DOC_LABELS: Record<string, string> = {
  pan_card: 'PAN Card', aadhar: 'Aadhar Card',
  driving_license: 'Driving License', voter_id: 'Voter ID',
};

const ADMIN_PASSWORD = 'admin@kyc123';

// ─── Password Gate ─────────────────────────────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('kyc_admin_auth', '1');
      onUnlock();
    } else {
      setError(true); setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--paper)' }}>
      <div className={`w-full max-w-sm rounded-2xl shadow-lg overflow-hidden ${shake ? 'animate-shake' : ''}`}
        style={{ background: 'white', border: '1px solid var(--border)' }}>
        <div style={{ height: '4px', background: 'var(--accent)' }} />
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="serif text-2xl mb-1" style={{ color: 'var(--ink)' }}>Admin Access</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Enter password to continue</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" className="form-input text-center tracking-widest"
              placeholder="••••••••" value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }} autoFocus />
            {error && <p className="text-xs" style={{ color: '#b91c1c' }}>⚠️ Incorrect password.</p>}
            <button type="submit" className="btn-submit">Unlock Dashboard</button>
          </form>
          <a href="/" className="inline-block mt-4 text-xs underline" style={{ color: 'var(--muted)' }}>← Back to Form</a>
        </div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}.animate-shake{animation:shake 0.4s ease}`}</style>
    </div>
  );
}

// ─── Photo Modal ──────────────────────────────────────────────────────────────

function PhotoModal({ path, label, onClose }: { path: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="relative max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{label}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 text-lg">✕</button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/admin/photo?path=${encodeURIComponent(path)}`} alt={label}
          className="w-full object-contain" style={{ maxHeight: '70vh' }}
          onContextMenu={e => e.preventDefault()} draggable={false} />
        <div className="px-5 py-2 text-center text-xs" style={{ color: 'var(--muted)' }}>
          🔒 View only — right-click and dragging disabled
        </div>
      </div>
    </div>
  );
}

// ─── Issue Token Modal ────────────────────────────────────────────────────────

function IssueModal({ event, onClose, onSuccess }: { event: Event; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'all' | 'select' | 'manual'>('all');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [result, setResult] = useState<{ issued: number; skipped: number; message: string } | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (mode === 'select') {
      setFetchingUsers(true);
      fetch(`/api/admin/events/issue?eventId=${event.id}`)
        .then(r => r.json())
        .then(d => setUsers(d.users || []))
        .finally(() => setFetchingUsers(false));
    }
  }, [mode, event.id]);

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  const toggleUser = (uid: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(uid) ? n.delete(uid) : n.add(uid);
      return n;
    });
  };

  const selectAll = () => {
    const eligible = filteredUsers.filter(u => !u.already_issued).map(u => u.user_id);
    setSelected(prev => {
      const n = new Set(prev);
      eligible.forEach(id => n.add(id));
      return n;
    });
  };

  const handleIssue = async () => {
    setError(''); setLoading(true);
    try {
      const body: Record<string, unknown> = { eventId: event.id, mode };
      if (mode === 'select') body.userIds = Array.from(selected);
      if (mode === 'manual') {
        body.identifiers = manualInput.split(',').map(s => s.trim()).filter(Boolean);
      }
      const res = await fetch('/api/admin/events/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to issue tokens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: 'white' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'var(--ink)' }} className="px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-widest mb-0.5">Issue Attendance Token</p>
            <h3 className="serif text-lg text-white">{event.name}</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl mt-1">✕</button>
        </div>

        {result ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">🎟️</div>
            <p className="font-semibold text-lg mb-1" style={{ color: 'var(--ink)' }}>Tokens Issued!</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{result.message}</p>
            <div className="flex justify-center gap-4 mt-4">
              <div className="text-center px-6 py-3 rounded-xl" style={{ background: 'var(--accent-light)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{result.issued}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Issued</p>
              </div>
              <div className="text-center px-6 py-3 rounded-xl" style={{ background: 'var(--cream)' }}>
                <p className="text-2xl font-bold" style={{ color: 'var(--muted)' }}>{result.skipped}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Already had</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-submit mt-6">Done</button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <div className="p-6 space-y-5">
              {/* Mode selector */}
              <div>
                <p className="form-label">Issue method</p>
                <div className="grid grid-cols-3 gap-2">
                  {([['all', '👥', 'All Users'], ['select', '☑️', 'Select Users'], ['manual', '✏️', 'Manual Entry']] as const).map(([m, icon, lbl]) => (
                    <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                      className="py-3 rounded-xl text-center text-sm transition-all border-2"
                      style={{
                        borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
                        background: mode === m ? 'var(--accent-light)' : 'white',
                        color: mode === m ? 'var(--accent)' : 'var(--ink)',
                        fontWeight: mode === m ? 600 : 400,
                      }}>
                      <span className="block text-lg mb-0.5">{icon}</span>{lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* All mode */}
              {mode === 'all' && (
                <div className="rounded-xl p-4 text-sm text-center" style={{ background: 'var(--cream)' }}>
                  <p style={{ color: 'var(--ink)' }}>This will issue tokens to <strong>all registered users</strong>.</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Users who already have this token will be skipped.</p>
                </div>
              )}

              {/* Select mode */}
              {mode === 'select' && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="text" className="form-input" placeholder="Search users..."
                      value={search} onChange={e => setSearch(e.target.value)} />
                    <button type="button" onClick={selectAll}
                      className="text-xs px-3 py-2 rounded-lg flex-shrink-0 font-medium"
                      style={{ background: 'var(--cream)', color: 'var(--ink)' }}>
                      Select all
                    </button>
                  </div>
                  {fetchingUsers ? (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Loading users...</p>
                  ) : (
                    <div className="rounded-xl border overflow-hidden max-h-56 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                      {filteredUsers.map(u => (
                        <label key={u.user_id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-0 hover:bg-gray-50"
                          style={{ borderColor: 'var(--border)', opacity: u.already_issued ? 0.5 : 1 }}>
                          <input type="checkbox"
                            checked={selected.has(u.user_id)}
                            disabled={u.already_issued}
                            onChange={() => toggleUser(u.user_id)}
                            className="w-4 h-4 accent-orange-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{u.full_name}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{u.email}</p>
                          </div>
                          {u.already_issued && (
                            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: 'rgba(200,75,47,0.2)', color: 'var(--accent)' }}>
                              Issued
                            </span>
                          )}
                        </label>
                      ))}
                      {filteredUsers.length === 0 && (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>No users found.</p>
                      )}
                    </div>
                  )}
                  {selected.size > 0 && (
                    <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{selected.size} user(s) selected</p>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {mode === 'manual' && (
                <div>
                  <label className="form-label">Emails or phone numbers (comma separated)</label>
                  <textarea className="form-input resize-none" rows={4}
                    placeholder="user@example.com, +91 98765 43210, another@email.com"
                    value={manualInput} onChange={e => setManualInput(e.target.value)} />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Enter the emails or phone numbers of users to issue tokens to.
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!result && (
          <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <button type="button" className="btn-submit" onClick={handleIssue} disabled={loading ||
              (mode === 'select' && selected.size === 0) ||
              (mode === 'manual' && !manualInput.trim())}>
              {loading ? <><span className="spinner" />Issuing...</> : '🎟️ Issue Tokens'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', eventDate: '', location: '', description: '', speaker: '', category: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleImage = (file: File) => {
    setImage(file);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);
      const res = await fetch('/api/admin/events', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

  const CATEGORIES = ['Conference', 'Workshop', 'Seminar', 'Meetup', 'Webinar', 'Training', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: 'white' }} onClick={e => e.stopPropagation()}>

        <div style={{ background: 'var(--ink)' }} className="px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="serif text-lg text-white">Create New Event</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-4">

            {/* Event image */}
            <div>
              <label className="form-label">Event Banner / Image</label>
              <div
                className="upload-zone rounded-xl h-32 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => document.getElementById('event-img-input')?.click()}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center select-none pointer-events-none">
                    <span className="text-2xl">🖼️</span>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Click to upload image</p>
                  </div>
                )}
              </div>
              <input id="event-img-input" type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ''; }} />
            </div>

            <div>
              <label className="form-label">Event Name <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input type="text" className="form-input" placeholder="e.g. Annual Tech Summit 2025"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Event Date <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input type="date" className="form-input"
                  value={form.eventDate} onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Category</label>
                <div className="select-wrapper">
                  <select className="form-input" value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Location / Venue</label>
              <input type="text" className="form-input" placeholder="e.g. Mumbai Convention Centre"
                value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>

            <div>
              <label className="form-label">Speaker / Host</label>
              <input type="text" className="form-input" placeholder="e.g. Dr. Anita Sharma"
                value={form.speaker} onChange={e => setForm(p => ({ ...p, speaker: e.target.value }))} />
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea className="form-input resize-none" rows={3}
                placeholder="Brief description of the event..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button type="button" className="btn-submit" onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={loading}>
            {loading ? <><span className="spinner" />Creating...</> : '✨ Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function Dashboard() {
  const [tab, setTab] = useState<'submissions' | 'events'>('submissions');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ path: string; label: string } | null>(null);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [issueEvent, setIssueEvent] = useState<Event | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/submissions');
      const data = await res.json();
      if (res.ok) setSubmissions(data.submissions);
    } catch { setError('Failed to load submissions.'); }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (res.ok) setEvents(data.events);
    } catch { setError('Failed to load events.'); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSubmissions(), fetchEvents()]).finally(() => setLoading(false));
  }, [fetchSubmissions, fetchEvents]);

  const filteredSubs = submissions.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      {modal && <PhotoModal path={modal.path} label={modal.label} onClose={() => setModal(null)} />}
      {showCreateEvent && (
        <CreateEventModal onClose={() => setShowCreateEvent(false)} onCreated={fetchEvents} />
      )}
      {issueEvent && (
        <IssueModal event={issueEvent} onClose={() => setIssueEvent(null)} onSuccess={fetchEvents} />
      )}

      {/* Header */}
      <div style={{ background: 'var(--ink)', borderBottom: '3px solid var(--accent)' }} className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <Image src="/logo5.png" alt="PV" width={50} height={50} priority style={{ objectFit: 'cover' }} />
              {/* <div className="leading-none">
                <span className="text-white font-semibold text-base tracking-tight">Presque</span>
                <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--accent)' }}> Vu</span>
              </div> */}
            </div>
            <div className="w-px h-5 bg-white/20" />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full font-semibold hidden sm:inline"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {submissions.length} users · {events.length} events
            </span>
            <a href="/" className="text-xs underline text-white/50 hover:text-white/80">← Form</a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-5">
        <div className="flex gap-1 p-1 rounded-xl w-fit mb-5" style={{ background: 'var(--cream)' }}>
          {([['submissions', '👤 Submissions'], ['events', '🎟️ Events']] as const).map(([t, lbl]) => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); }}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? 'var(--ink)' : 'var(--muted)',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {lbl}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
            <div className="spinner inline-block" style={{ borderTopColor: 'var(--accent)', borderColor: 'var(--border)', width: 28, height: 28 }} />
            <p className="mt-3 text-sm">Loading...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg px-4 py-3 text-sm mb-4"
            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Submissions Tab ── */}
        {!loading && tab === 'submissions' && (
          <>
            <div className="mb-4">
              <input type="text" className="form-input max-w-sm"
                placeholder="🔍 Search by name, email, phone..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredSubs.length === 0 && (
                <div className="col-span-2 text-center py-16" style={{ color: 'var(--muted)' }}>
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-sm">{search ? 'No results.' : 'No submissions yet.'}</p>
                </div>
              )}
              {filteredSubs.map(s => (
                <div key={s.id}
                  className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  style={{ background: 'white', border: selectedSub?.id === s.id ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                  onClick={() => setSelectedSub(selectedSub?.id === s.id ? null : s)}>
                  <div className="px-5 py-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'var(--accent)' }}>
                        {s.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{s.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.email}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        ✓ Registered
                      </span>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>#{s.id}</p>
                    </div>
                  </div>
                  <div className="px-5 pb-3 flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                    <span>📞 {s.phone}</span>
                    <span>🕐 {formatDate(s.created_at)}</span>
                  </div>
                  {selectedSub?.id === s.id && (
                    <div className="px-5 pb-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}
                      onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--gold)' }}>Account Details</p>
                      <div className="space-y-2 text-xs" style={{ color: 'var(--muted)' }}>
                        <p>📧 {s.email}</p>
                        <p>📞 {s.phone}</p>
                        <p>✅ Consent: {s.consent_given_at ? new Date(s.consent_given_at).toLocaleDateString('en-IN') : 'N/A'} (Policy {s.policy_version || 'v1.0'})</p>
                        <p>🕐 Last login: {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString('en-IN') : 'Never'}</p>
                        <p className="font-mono break-all pt-1">UUID: {s.user_id}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Events Tab ── */}
        {!loading && tab === 'events' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{events.length} event(s) created</p>
              <button onClick={() => setShowCreateEvent(true)} className="btn-submit"
                style={{ width: 'auto', padding: '10px 20px', fontSize: '14px' }}>
                + New Event
              </button>
            </div>

            {events.length === 0 && (
              <div className="text-center py-20 rounded-2xl" style={{ background: 'white', border: '2px dashed var(--border)' }}>
                <p className="text-5xl mb-3">🎟️</p>
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>No events yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Create your first event to start issuing attendance tokens.</p>
                <button onClick={() => setShowCreateEvent(true)}
                  className="btn-submit mt-5" style={{ width: 'auto', padding: '10px 24px' }}>
                  + Create Event
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(ev => (
                <div key={ev.id} className="rounded-xl overflow-hidden shadow-sm"
                  style={{ background: 'white', border: '1px solid var(--border)' }}>
                  {/* Event image */}
                  <div className="h-36 relative overflow-hidden" style={{ background: 'var(--cream)' }}>
                    {ev.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/admin/photo?path=${encodeURIComponent(ev.image_path)}`}
                        alt={ev.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">🎫</span>
                      </div>
                    )}
                    {ev.category && (
                      <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(15,14,12,0.7)', color: 'white' }}>
                        {ev.category}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-sm leading-tight mb-1" style={{ color: 'var(--ink)' }}>{ev.name}</h3>
                    <div className="space-y-1 mb-3">
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        📅 {new Date(ev.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {ev.location && <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>📍 {ev.location}</p>}
                      {ev.speaker && <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>🎤 {ev.speaker}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
                        🎟️ {ev.issued_count} issued
                      </span>
                      <button onClick={() => setIssueEvent(ev)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                        style={{ background: 'var(--accent)', color: 'white' }}>
                        Issue Token
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="pb-10" />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('kyc_admin_auth') === '1') {
      setAuthed(true);
    }
  }, []);

  if (!authed) return <PasswordGate onUnlock={() => setAuthed(true)} />;
  return <Dashboard />;
}