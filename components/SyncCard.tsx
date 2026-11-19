'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { SYNC_DB_URL } from '@/lib/appConfig';
import {
  MIN_PASS_LEN, joinLink, loadSyncConfig, normalizeDbUrl, normalizePass, peekRoom, roomFromPass,
  type SyncConfig,
} from '@/lib/sync';
import { Banner, Card, SectionTitle } from './Card';
import { Button } from './Button';
import { SyncBadge } from './SyncBadge';
import { Confirm, Prompt } from './Modal';
import { toast } from './Toast';

const RULES = `{
  "rules": {
    "rooms": {
      "$room": { ".read": true, ".write": true }
    }
  }
}`;

const BUILTIN_URL = normalizeDbUrl(SYNC_DB_URL);

/*
 * 端末間の同期。合言葉を入れるだけで始められるようにしている。
 * 同じ合言葉を入れた端末どうしが同じ部屋になり、進行が共有される。
 * 接続先（データベースURL）はアプリに内蔵したものを使い、内蔵が無い場合だけ入力欄を出す。
 */
export function SyncCard() {
  const status = useStore((s) => s.syncStatus);
  const msg = useStore((s) => s.syncMsg);
  const enableSync = useStore((s) => s.enableSync);
  const disableSync = useStore((s) => s.disableSync);
  const [cfg, setCfg] = useState<SyncConfig | null>(null);
  const [pass, setPass] = useState('');
  const [url, setUrl] = useState('');
  const [legacyRoom, setLegacyRoom] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [help, setHelp] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ask, setAsk] = useState<{ c: SyncConfig; teams: number; matches: number } | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  // エラー時は設定フォームを出す（直せないと詰むため）
  const on = status === 'online' || status === 'connecting' || status === 'offline';

  // 参加リンクなど、この画面の外から同期が始まることもあるので、状態が変わるたびに読み直す
  useEffect(() => {
    const c = loadSyncConfig();
    setCfg(c);
    if (c && c.dbUrl !== BUILTIN_URL) setUrl(c.dbUrl);
  }, [status]);

  const dbUrl = normalizeDbUrl(url) || BUILTIN_URL;

  async function connect(c: SyncConfig, created: boolean) {
    setBusy(true);
    await enableSync(c);
    setBusy(false);
    setPass('');
    toast(created ? 'この端末のデータで同期を始めました' : '同期に参加しました');
  }

  async function start() {
    setErr('');
    if (!dbUrl) { setErr('接続先のデータベースURLが未設定です。下の「詳細設定」から入力してください。'); setAdvanced(true); return; }
    const code = legacyRoom.trim();
    const p = normalizePass(pass);
    if (!code && p.length < MIN_PASS_LEN) { setErr(`合言葉は${MIN_PASS_LEN}文字以上にしてください。`); return; }

    setBusy(true);
    try {
      const c: SyncConfig = code ? { dbUrl, room: code } : { dbUrl, room: await roomFromPass(p), pass: p };
      const found = await peekRoom(c);
      const d = useStore.getState().data;
      const hasLocal = d.players.length > 0 || d.matches.length > 0;
      // 既にある部屋に入ると手元のデータは部屋の内容に置き換わる。黙って消さない
      if (found && hasLocal) { setAsk({ c, ...found }); return; }
      await connect(c, !found);
    } catch (e) {
      setErr(`接続できませんでした（${e instanceof Error ? e.message : String(e)}）。電波と接続先の設定を確認してください。`);
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, okMsg: string) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast(okMsg))
      .catch(() => setFallback(text));
  }

  return (
    <Card>
      <SectionTitle>
        端末間の同期
        <SyncBadge className="ml-auto" />
      </SectionTitle>

      {on && cfg ? (
        <>
          <Banner variant="info" className="mb-3">
            {status === 'online' && '同じ合言葉の端末すべてが同じ進行を見ています。変更は自動で反映されます。'}
            {status === 'connecting' && '接続しています…'}
            {status === 'offline' && 'いま接続できていません。操作はこの端末に残り、つながり次第まとめて送られます。'}
          </Banner>

          {cfg.pass ? (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-bold text-mute">合言葉</label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 break-all rounded-xl border border-line bg-panel2 px-3 py-2 text-sm font-extrabold">
                  {showPass ? cfg.pass : '•'.repeat(Math.min(cfg.pass.length, 12))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowPass(!showPass)}>
                  {showPass ? '隠す' : '表示'}
                </Button>
              </div>
              <p className="mb-0 mt-1.5 text-[11px] leading-relaxed text-mute">
                他の端末では、設定の「端末間の同期」に<b>同じ合言葉を入れるだけ</b>で参加できます。
              </p>
            </div>
          ) : (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-bold text-mute">部屋コード</label>
              <div className="font-num select-all break-all rounded-xl border border-line bg-panel2 px-3 py-2 text-sm font-extrabold">
                {cfg.room}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => copy(joinLink(cfg), '参加リンクをコピーしました')}>
              参加リンクをコピー
            </Button>
            <Button variant="ghost" onClick={() => { disableSync(); toast('同期を停止しました'); }}>
              同期を停止
            </Button>
          </div>
          <p className="mb-0 mt-2.5 text-xs leading-relaxed text-mute">
            参加リンクを送る方法でも参加できます（開くだけで同じ部屋に入ります）。
            合言葉とリンクは、関係者以外には共有しないでください。
          </p>
        </>
      ) : (
        <>
          <p className="mt-0 text-xs leading-relaxed text-mute">
            複数のスマホで同じ進行ボードを操作できます。<b>全員が同じ合言葉を入れるだけ</b>で始められます。
            最初に入れた端末のデータが共有され、あとから入れた端末はその内容に合わせられます。
          </p>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-bold text-mute">合言葉（{MIN_PASS_LEN}文字以上）</label>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="例: balblanc-aki2026"
              className="input"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void start(); }}
            />
            <p className="mb-0 mt-1.5 text-[11px] leading-relaxed text-mute">
              合言葉を知っている人は誰でも参加できます。大会名だけのような、当てられやすいものは避けてください。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={busy} onClick={start}>
              {busy ? '接続中…' : '同期を開始'}
            </Button>
            <Button variant="ghost" onClick={() => setAdvanced(!advanced)}>
              {advanced ? '詳細設定を閉じる' : '詳細設定'}
            </Button>
          </div>

          {!BUILTIN_URL && !advanced && !normalizeDbUrl(url) && (
            <Banner variant="warn" className="mt-3">
              接続先のデータベースがまだアプリに登録されていません。「詳細設定」からデータベースURLを入力してください。
            </Banner>
          )}
          {err && <Banner variant="danger" className="mt-3">{err}</Banner>}
          {status === 'error' && !err && <Banner variant="danger" className="mt-3">同期できません: {msg}</Banner>}

          {advanced && (
            <div className="mt-3 rounded-xl border border-line bg-panel2 p-3">
              <div className="mb-3">
                <label className="mb-1 block text-xs font-bold text-mute">
                  データベースURL{BUILTIN_URL ? '（空欄ならアプリ内蔵の接続先を使います）' : ''}
                </label>
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://〇〇-default-rtdb.asia-southeast1.firebasedatabase.app"
                  className="input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-bold text-mute">部屋コードで参加（以前の方式を使う場合のみ）</label>
                <input
                  type="text"
                  autoComplete="off"
                  className="input font-num"
                  placeholder="空欄なら合言葉を使います"
                  value={legacyRoom}
                  onChange={(e) => setLegacyRoom(e.target.value.trim())}
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => setHelp(!help)}>
                {help ? '手順を閉じる' : 'データベースの作り方'}
              </Button>
              {help && (
                <div className="mt-3 text-xs leading-relaxed text-ink/90">
                  <ol className="ml-4 list-decimal space-y-2">
                    <li>
                      <a className="font-bold text-cyan underline" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
                        Firebaseコンソール
                      </a>
                      でプロジェクトを作成します（無料。Googleアカウントでログイン）。
                    </li>
                    <li>左メニューの「構築 → Realtime Database」を開き、データベースを作成します。ロケーションはシンガポールなど近い場所を選びます。</li>
                    <li>「ルール」タブに次を貼り付けて公開します。</li>
                    <li>
                      画面上部に出ている <span className="font-bold">https://…firebasedatabase.app</span> がデータベースURLです。
                    </li>
                  </ol>
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-panel p-2.5 text-[11px] leading-snug">{RULES}</pre>
                  <div className="mt-2">
                    <Button size="sm" variant="ghost" onClick={() => copy(RULES, 'ルールをコピーしました')}>ルールをコピー</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {ask && (
        <Confirm
          message={`この合言葉の部屋には、すでにデータがあります（チーム${ask.teams}・試合${ask.matches}）。\n参加すると、この端末のデータは部屋の内容に置き換わります。`}
          danger
          onOk={() => { const c = ask.c; setAsk(null); void connect(c, false); }}
          onClose={() => setAsk(null)}
        />
      )}

      {fallback && (
        <Prompt
          title="コピーしてください"
          initial={fallback}
          onOk={() => setFallback(null)}
          onClose={() => setFallback(null)}
        />
      )}
    </Card>
  );
}
