'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { joinLink, loadSyncConfig, newRoomCode, normalizeDbUrl } from '@/lib/sync';
import { Banner, Card, SectionTitle } from './Card';
import { Button } from './Button';
import { SyncBadge } from './SyncBadge';
import { Prompt } from './Modal';
import { toast } from './Toast';

const RULES = `{
  "rules": {
    "rooms": {
      "$room": { ".read": true, ".write": true }
    }
  }
}`;

export function SyncCard() {
  const status = useStore((s) => s.syncStatus);
  const msg = useStore((s) => s.syncMsg);
  const enableSync = useStore((s) => s.enableSync);
  const disableSync = useStore((s) => s.disableSync);
  const [url, setUrl] = useState('');
  const [room, setRoom] = useState('');
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  // エラー時は設定フォームを出す（URLを直せないと詰むため）
  const on = status === 'online' || status === 'connecting' || status === 'offline';

  useEffect(() => {
    const c = loadSyncConfig();
    if (c) { setUrl(c.dbUrl); setRoom(c.room); }
    else setRoom(newRoomCode());
  }, []);

  async function start() {
    const dbUrl = normalizeDbUrl(url);
    if (!dbUrl) { toast('データベースURLを入力してください'); return; }
    const r = room.trim() || newRoomCode();
    setRoom(r);
    setBusy(true);
    await enableSync({ dbUrl, room: r });
    setBusy(false);
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

      {on ? (
        <>
          <Banner variant="info" className="mb-3">
            {status === 'online' && 'この部屋の全員が同じ進行を見ています。変更は自動で反映されます。'}
            {status === 'connecting' && '接続しています…'}
            {status === 'offline' && 'いま接続できていません。操作はこの端末に残り、つながり次第まとめて送られます。'}
          </Banner>
          {/* 参加リンク経由だと自分でURLを入れないため、どこに繋がっているかを必ず見せる */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-bold text-mute">接続先のデータベース</label>
            <div className="select-all break-all rounded-xl border border-line bg-panel2 px-3 py-2 text-[11px] font-bold leading-snug text-mute">
              {url || '(不明)'}
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-bold text-mute">部屋コード</label>
            <div className="font-num select-all break-all rounded-xl border border-line bg-panel2 px-3 py-2 text-sm font-extrabold">
              {room}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => copy(joinLink({ dbUrl: normalizeDbUrl(url), room }), '参加リンクをコピーしました')}
            >
              参加リンクをコピー
            </Button>
            <Button variant="ghost" onClick={() => { disableSync(); toast('同期を停止しました'); }}>
              同期を停止
            </Button>
          </div>
          <p className="mb-0 mt-2.5 text-xs leading-relaxed text-mute">
            このリンクを他の運営メンバーに送ると、開くだけで同じ部屋に参加できます。
            部屋コードが合言葉なので、関係者以外には共有しないでください。
          </p>
        </>
      ) : (
        <>
          <p className="mt-0 text-xs leading-relaxed text-mute">
            複数のスマホから同じ進行ボードを操作できるようにします。無料のFirebase Realtime Databaseを使うため、
            最初に一度だけデータベースを作る作業が必要です。
          </p>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-bold text-mute">データベースURL</label>
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
            <label className="mb-1 block text-xs font-bold text-mute">部屋コード（合言葉）</label>
            <div className="flex gap-2">
              <input type="text" className="input font-num" value={room} onChange={(e) => setRoom(e.target.value.trim())} />
              <Button variant="ghost" onClick={() => setRoom(newRoomCode())}>作り直す</Button>
            </div>
            <p className="mb-0 mt-1.5 text-[11px] leading-relaxed text-mute">
              最初の1台はこのままで構いません。すでに動いている端末に加わるときは、
              その端末の設定に出ている部屋コードとデータベースURLを同じものにしてください。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={busy} onClick={start}>
              {busy ? '接続中…' : '同期を開始'}
            </Button>
            <Button variant="ghost" onClick={() => setHelp(!help)}>
              {help ? '手順を閉じる' : 'データベースの作り方'}
            </Button>
          </div>
          {status === 'error' && <Banner variant="danger" className="mt-3">同期できません: {msg}</Banner>}

          {help && (
            <div className="mt-3 rounded-xl border border-line bg-panel2 p-3 text-xs leading-relaxed text-ink/90">
              <ol className="ml-4 list-decimal space-y-2">
                <li>
                  <a className="font-bold text-cyan underline" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">
                    Firebaseコンソール
                  </a>
                  でプロジェクトを作成します（無料。Googleアカウントでログイン）。
                </li>
                <li>左メニューの「構築 → Realtime Database」を開き、データベースを作成します。ロケーションはシンガポールなど近い場所を選びます。</li>
                <li>「テストモードで開始」を選ぶか、「ルール」タブに次を貼り付けて公開します。</li>
                <li>
                  画面上部に出ている <span className="font-bold">https://…firebasedatabase.app</span> がデータベースURLです。
                  コピーして上の欄に貼り付け、「同期を開始」を押します。
                </li>
              </ol>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-panel p-2.5 text-[11px] leading-snug">{RULES}</pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => copy(RULES, 'ルールをコピーしました')}>ルールをコピー</Button>
              </div>
              <p className="mb-0 mt-2 text-mute">
                このルールは部屋コードを知っている人だけが読み書きできる状態です。コードは自動生成の12文字なので推測はまず不可能ですが、
                大会の進行データ以外は置かないでください。
              </p>
            </div>
          )}
        </>
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
