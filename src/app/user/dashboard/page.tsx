'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import UserNav from '@/components/UserNav';
import ComplianceFooter from '@/components/ComplianceFooter';

type Token = {
  token_id: number;
  issued_at: string;
  event_id: number;
  name: string;
  event_date: string;
  location: string | null;
  description: string | null;
  speaker: string | null;
  category: string | null;
  image_path: string | null;
};

function TokenCard({ token }: { token: Token }) {
  const eventDate = new Date(token.event_date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const issuedDate = new Date(token.issued_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
      style={{ background: 'white', border: '1px solid var(--border)' }}>
      <div className="h-36 relative overflow-hidden" style={{ background: 'var(--cream)' }}>
        {token.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/admin/photo?path=${encodeURIComponent(token.image_path)}`}
            alt={token.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><span className="text-5xl">🎫</span></div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(15,14,12,0.75)', color: 'white', backdropFilter: 'blur(4px)' }}>
          <span style={{ color: '#4ade80' }}>✓</span> Attended
        </div>
        {token.category && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(15,14,12,0.65)', color: 'white' }}>
            {token.category}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-base leading-tight mb-2" style={{ color: 'var(--ink)' }}>{token.name}</h3>
        <div className="space-y-1 mb-3">
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--muted)' }}><span>📅</span> {eventDate}</p>
          {token.location && <p className="text-xs flex items-center gap-1.5 truncate" style={{ color: 'var(--muted)' }}><span>📍</span> {token.location}</p>}
          {token.speaker && <p className="text-xs flex items-center gap-1.5 truncate" style={{ color: 'var(--muted)' }}><span>🎤</span> {token.speaker}</p>}
          {token.description && <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--muted)' }}>{token.description}</p>}
        </div>
        <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Issued {issuedDate}</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--cream)', color: 'var(--muted)' }}>#{token.token_id}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/user/tokens')
      .then(r => r.json())
      .then(d => setTokens(d.tokens || []))
      .finally(() => setTokensLoading(false));
  }, [user]);

  if (authLoading) {
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
      <UserNav user={user} onLogout={logout} />

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="mb-7">
          <h1 className="serif text-3xl" style={{ color: 'var(--ink)' }}>Welcome, {user.fullName.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Your attendance tokens and proof of participation</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl px-5 py-4" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold serif" style={{ color: 'var(--accent)' }}>{tokens.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Events Attended</p>
          </div>
          <div className="rounded-xl px-5 py-4" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold serif" style={{ color: 'var(--gold)' }}>{tokens.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Tokens Earned</p>
          </div>
          <div className="rounded-xl px-5 py-4 hidden sm:block" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold serif" style={{ color: 'var(--ink)' }}>
              {tokens.length > 0
                ? new Date(tokens[tokens.length - 1].event_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                : '—'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>First Event</p>
          </div>
        </div>

        {/* Tokens header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-widest" style={{ color: 'var(--gold)' }}>🎟️ My Attendance Tokens</h2>
          {tokens.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {tokens.length} token{tokens.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tokens loading */}
        {tokensLoading && (
          <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
            <div className="spinner inline-block" style={{ borderTopColor: 'var(--accent)', borderColor: 'var(--border)', width: 24, height: 24 }} />
            <p className="mt-2 text-sm">Loading tokens...</p>
          </div>
        )}

        {/* Empty state */}
        {!tokensLoading && tokens.length === 0 && (
          <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
            style={{ background: 'white', border: '2px dashed var(--border)' }}>
            <div className="text-5xl mb-4">🎫</div>
            <h2 className="serif text-xl mb-2" style={{ color: 'var(--ink)' }}>No tokens yet</h2>
            <p className="text-sm max-w-xs" style={{ color: 'var(--muted)' }}>
              Attendance tokens will appear here once an admin issues them to you after an event.
            </p>
          </div>
        )}

        {/* Token cards */}
        {!tokensLoading && tokens.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map(token => <TokenCard key={token.token_id} token={token} />)}
          </div>
        )}
      </div>

      {/* Page-level footer — outside the card grid */}
      <ComplianceFooter className="pb-6 mt-4" />
    </div>
  );
}