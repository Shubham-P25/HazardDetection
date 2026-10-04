'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { ConnectionPill } from '@/components/ConnectionPill';
import { useSensorStore } from '@/stores/sensorStore';

const items = [
  { href: '/', label: 'Overview' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/map', label: 'Zone map' },
  { href: '/incidents', label: 'Incidents' },
];

export function Navbar() {
  const path = usePathname();
  const openCount = useSensorStore((s) => s.openIncidentCount);
  const clerkOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">HG</span>
          <span>
            <strong>HazardGuard</strong>
            <small>Industrial safety dashboard</small>
          </span>
        </Link>
        <nav className="nav desktop-nav" aria-label="Primary">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={path === item.href ? 'active' : ''}
              aria-current={path === item.href ? 'page' : undefined}
            >
              {item.label}
              {item.href === '/incidents' && openCount > 0 && <span className="count-badge">{openCount}</span>}
            </Link>
          ))}
        </nav>
        <div className="topbar-right">
          <ConnectionPill />
          {clerkOn && (
            <SignedIn>
              <UserButton afterSignOutUrl="/sign-in" />
            </SignedIn>
          )}
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={path === item.href ? 'active' : ''} aria-current={path === item.href ? 'page' : undefined}>
            {item.label}
            {item.href === '/incidents' && openCount > 0 && <span className="count-badge">{openCount}</span>}
          </Link>
        ))}
      </nav>
    </>
  );
}
