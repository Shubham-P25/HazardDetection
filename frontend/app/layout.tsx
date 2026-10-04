import { Barlow_Condensed, DM_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const dm = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const barlow = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });

export const metadata = { title: 'HazardGuard | Industrial Safety', description: 'Live industrial hazard detection dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dm.variable} ${barlow.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
