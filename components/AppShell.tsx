'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { applyTheme } from '@/lib/themes';
import { PASS_HASH, sha256hex } from '@/lib/crypto';
import type { Provider } from '@/lib/types';
import { Toaster, toast } from './Toast';
import { Button } from './Button';
import {
  BallLogo, IconBoard, IconCamera, IconChart, IconGear, IconList, IconMore, IconSave, IconTrophy, IconUsers,
} from './icons';

const TABS = [
  { href: '/', label: '進行ボード', short: 'ボード', icon: IconBoard },
  { href: '/matches', label: '試合一覧', short: '試合', icon: IconList },
  { href: '/standings', label: '順位表', short: '順位', icon: IconTrophy },
  { href: '/players', label: 'チーム・選手', short: '選手', icon: IconUsers },
  { href: '/stats', label: '個人成績', short: '成績', icon: IconChart },
  { href: '/import', label: '写真取り込み', short: '取込', icon: IconCamera },
  { href: '/saves', label: '保存データ', short: '保存', icon: IconSave },
  { href: '/settings', label: '設定', short: '設定', icon: IconGear },
];
const MOBILE_MAIN = TABS.slice(0, 4);
const MOBILE_MORE = TABS.slice(4);

function normPath(p: string | null): string {
  const s = (p || '/').replace(/\/+$/, '');
  return s === '' ? '/' : s;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(true);
  const [more, setMore] = useState(false);
  const hydrated = useStore((s) => s.hydrated);
  const theme = useStore((s) => s.theme);
  const pathname = normPath(usePathname());

  useEffect(() => {
    if (hydrated) applyTheme(theme);
  }, [hydrated, theme]);

  useEffect(() => {
    if (localStorage.getItem('gate_ok') === PASS_HASH) setLocked(false);
    (async () => {
      await useStore.persist.rehydrate();
      useStore.setState({ hydrated: true });
      // URLハッシュ #k=APIキー&p=プロバイダ&m=モデル でキーを受け取る（設定リンク機能）
      if (location.hash.startsWith('#k=')) {
        try {
          const q = new URLSearchParams(location.hash.slice(1));
          const k = q.get('k');
          if (k) {
            useStore.getState().mutate((d) => {
              d.ai.key = k;
              const p = q.get('p');
              if (p) d.ai.provider = p as Provider;
              const m = q.get('m');
              if (m) d.ai.model = m;
            });
            history.replaceState(null, '', location.pathname + location.search); // キーをURLから消す
            setTimeout(() => toast('APIキーを設定しました'), 400);
          }
        } catch { /* ignore */ }
      }
    })();
  }, []);

  useEffect(() => {
    setMore(false);
  }, [pathname]);

  if (locked) return <Gate onUnlock={() => setLocked(false)} />;

  const appTitle = 'BALBLANC 試合進行';

  return (
    <div className="min-h-dvh">
      {/* デスクトップ: 左サイドバー */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-panel/85 backdrop-blur md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-6">
          <span className="h-7 w-7 flex-none"><BallLogo /></span>
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-extrabold leading-tight">{appTitle}</div>
            <div className="text-[10px] font-bold tracking-widest text-mute">TAIKOUSEN BOARD</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-6">
          {TABS.map((t) => {
            const active = pathname === t.href;
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition ${
                  active ? 'glow-neon bg-neon/12 text-neon' : 'text-mute hover:bg-panel2 hover:text-ink'
                }`}
              >
                <Icon width={19} height={19} />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 pb-5 text-[10px] text-mute/70">BALBLANC tournament v2</div>
      </aside>

      <div className="md:pl-60">
        {/* モバイル: 上部ヘッダー */}
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="h-6 w-6 flex-none"><BallLogo /></span>
            <h1 className="truncate font-display text-base font-extrabold">{appTitle}</h1>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-3 py-4 pb-28 md:px-6 md:py-6 md:pb-10">
          {hydrated ? children : <div className="p-10 text-center text-sm text-mute">読み込み中…</div>}
        </main>
      </div>

      {/* モバイル: 下部タブバー */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_MAIN.map((t) => {
            const active = pathname === t.href;
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
                  active ? 'text-neon' : 'text-mute'
                }`}
              >
                <Icon width={21} height={21} />
                {t.short}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMore(true)}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
              MOBILE_MORE.some((t) => pathname === t.href) ? 'text-neon' : 'text-mute'
            }`}
          >
            <IconMore width={21} height={21} />
            その他
          </button>
        </div>
      </nav>

      {/* モバイル: その他シート */}
      {more && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMore(false)}>
          <div
            className="anim-modal absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-panel p-4 pb-[calc(20px+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MORE.map((t) => {
                const Icon = t.icon;
                const active = pathname === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-sm font-bold ${
                      active ? 'border-neon/50 bg-neon/10 text-neon' : 'border-line bg-panel2 text-ink'
                    }`}
                  >
                    <Icon width={20} height={20} />
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}

/* パスコードゲート（参照実装の PASS_HASH をそのまま使用） */
function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  async function tryUnlock() {
    const h = await sha256hex(v);
    if (h === PASS_HASH) {
      localStorage.setItem('gate_ok', PASS_HASH);
      onUnlock();
    } else {
      setErr('パスコードが違います');
      setV('');
      ref.current?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg p-5">
      <div className="anim-modal w-full max-w-xs rounded-3xl border border-line border-t-2 border-t-neon bg-panel p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-14 w-14"><BallLogo /></div>
        <h2 className="font-display text-xl font-extrabold">BALBLANC 試合進行</h2>
        <p className="mb-5 mt-1 text-xs text-mute">運営パスコードを入力してください</p>
        <input
          ref={ref}
          type="password"
          autoComplete="off"
          placeholder="パスコード"
          className="input mb-3 text-center text-lg tracking-widest"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') tryUnlock();
          }}
        />
        <Button variant="primary" className="w-full" onClick={tryUnlock}>入る</Button>
        <div className="mt-3 min-h-5 text-[13px] font-bold text-bad">{err}</div>
      </div>
    </div>
  );
}
