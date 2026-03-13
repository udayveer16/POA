'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type AuthUser = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  consentGivenAt: string;
  policyVersion: string;
  lastLoginAt: string | null;
};

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.replace('/login?redirect=' + encodeURIComponent(window.location.pathname));
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  return { user, loading, logout };
}