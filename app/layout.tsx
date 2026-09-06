import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'BALBLANC 試合進行',
  description: 'テニス対抗戦の進行管理ボード。出場者の被りを検出して、いま組める試合がすぐわかる。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f8f2',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ハイドレーション前にテーマを適用して初期描画のちらつきを防ぐ
  const themeInit = `try{var t=(JSON.parse(localStorage.getItem('tennis_taikousen_v3')||'{}').state||{}).theme;if(t)document.documentElement.dataset.theme=t;}catch(e){}`;
  /*
   * GitHub PagesはHTMLを10分キャッシュするが、デプロイで古いJSファイルは消える。
   * その間に開くと読めないスクリプトを掴んで白画面になるので、
   * スクリプトの読み込み失敗を捕まえて一度だけ強制再読み込みする。
   */
  const staleGuard = `addEventListener('error',function(e){var t=e&&e.target;`
    + `if(t&&t.tagName==='SCRIPT'&&t.src){try{if(sessionStorage.getItem('__reloadedForStale'))return;`
    + `sessionStorage.setItem('__reloadedForStale','1');location.reload();}catch(x){}}},true);`;
  return (
    <html lang="ja" className={outfit.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: staleGuard }} />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
