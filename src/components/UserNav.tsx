'use client';

import { AuthUser } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function UserNav({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const pathname = usePathname();

  const links = [
    { href: '/user/dashboard', label: 'Dashboard', icon: '⊞' },
    { href: '/user/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav style={{ background: 'var(--ink)', borderBottom: '3px solid var(--accent)' }}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Left: logo + links */}
        <div className="flex items-center gap-6">
          <a href="/user/dashboard" className="flex items-center gap-2.5">
            <Image
              src="/logo5.png"
              alt="PV"
              width={50}
              height={50}
              priority
              style={{ objectFit: 'contain' }}
            />
            {/* <div className="leading-none">
              <span className="text-white font-semibold text-base tracking-tight">Presque</span>
              <span style={{ color: 'var(--accent)' }} className="font-semibold text-base tracking-tight"> Vu</span>
            </div> */}
          </a>

          <div className="flex items-center gap-1">
            {links.map(link => (
              <a key={link.href} href={link.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{
                  background: pathname === link.href ? 'rgba(200,75,47,0.2)' : 'transparent',
                  color: pathname === link.href ? 'var(--accent)' : 'rgba(255,255,255,0.6)',
                  fontWeight: pathname === link.href ? 600 : 400,
                }}>
                <span className="text-xs">{link.icon}</span> {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right: user + logout */}
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-white hidden sm:block">{user.fullName}</p>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--accent)' }}>
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <button onClick={onLogout}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,75,47,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}