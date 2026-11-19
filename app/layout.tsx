import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-outfit' });

// GitHub Pages ではリポジトリ名の下に配信されるので、アイコンなどの場所はここを起点に組む
const IS_PROD = process.env.NODE_ENV === 'production';
const BASE = IS_PROD ? '/BALBLANC-tournament-v2' : '';

export const metadata: Metadata = {
  title: 'BALBLANC 試合進行',
  description: 'テニス対抗戦の進行管理ボード。出場者の被りを検出して、いま組める試合がすぐわかる。',
  // ホーム画面に追加したときにアプリとして開けるようにする
  manifest: `${BASE}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${BASE}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { url: `${BASE}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `${BASE}/icons/apple-touch-icon.png`, sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'BALBLANC', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f8f2',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  /*
   * GitHub PagesはHTMLを10分キャッシュするが、デプロイで古いJSファイルは消える。
   * その間に開くと読めないスクリプトを掴んで白画面になるので、
   * スクリプトの読み込み失敗を捕まえて一度だけ強制再読み込みする。
   */
  const staleGuard = `addEventListener('error',function(e){var t=e&&e.target;`
    + `if(t&&t.tagName==='SCRIPT'&&t.src){try{if(sessionStorage.getItem('__reloadedForStale'))return;`
    + `sessionStorage.setItem('__reloadedForStale','1');location.reload();}catch(x){}}},true);`;
  /*
   * アプリ化まわり。
   * - インストールの案内はページを開いた直後に一度しか飛んでこないので、設定画面を開く前でも
   *   取りこぼさないよう、ここで受け取って保管しておく。
   * - サービスワーカーは本番だけで登録する（開発中に古い画面を掴むと紛らわしいため）。
   */
  const pwaInit = `addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;dispatchEvent(new Event('bip-ready'));});`
    + `addEventListener('appinstalled',function(){window.__bip=null;dispatchEvent(new Event('bip-ready'));});`
    + (IS_PROD
      ? `if('serviceWorker' in navigator){addEventListener('load',function(){navigator.serviceWorker.register('${BASE}/sw.js',{scope:'${BASE}/'}).catch(function(){});});}`
      : '');
  return (
    <html lang="ja" className={outfit.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: staleGuard }} />
        <script dangerouslySetInnerHTML={{ __html: pwaInit }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
