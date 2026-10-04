'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { useSocket } from '@/hooks/useSocket';
import { Navbar } from '@/components/Navbar';
import { setTokenGetter } from '@/lib/api';
import { setSocketTokenGetter } from '@/lib/socket';

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

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
  useSocket();
  return <Shell>{children}</Shell>;
}

// B5: no token state – getToken() is called fresh on each request via setter
function AuthedShell({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Register token getter for both API and socket; called fresh per request
    const getter = () => getToken().catch(() => null);
    setTokenGetter(getter);
    setSocketTokenGetter(getter);
    return () => {
      setTokenGetter(null as any);
      setSocketTokenGetter(null);
    };
  }, [getToken]);

  useSocket();
  return <Shell>{children}</Shell>;
}
