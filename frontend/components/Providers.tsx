'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { useSocket } from '@/hooks/useSocket';
import { Navbar } from '@/components/Navbar';

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  || process.env.VITE_CLERK_PUBLISHABLE_KEY
  || '';

export function Providers({ children }: { children: React.ReactNode }) {
  if (!publishableKey) {
    return <LocalShell>{children}</LocalShell>;
  }
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AuthedShell>{children}</AuthedShell>
    </ClerkProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const authPage = path.startsWith('/sign-in') || path.startsWith('/sign-up');
  return <>{!authPage && <Navbar />}{children}</>;
}

function LocalShell({ children }: { children: React.ReactNode }) {
  useSocket(null);
  return <Shell>{children}</Shell>;
}

function AuthedShell({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let refresh: number;
    async function load() {
      const value = await getToken().catch(() => null);
      setToken(value);
    }
    load();
    refresh = window.setInterval(load, 50_000);
    return () => window.clearInterval(refresh);
  }, [getToken]);
  useSocket(token);
  return <Shell>{children}</Shell>;
}
