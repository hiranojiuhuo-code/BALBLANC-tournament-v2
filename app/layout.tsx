import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: '対抗戦 進行管理',
  description: 'テニス対抗戦の進行管理ボード。出場者の被りを検出して、いま組める試合がすぐわかる。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f8f2',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={outfit.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
