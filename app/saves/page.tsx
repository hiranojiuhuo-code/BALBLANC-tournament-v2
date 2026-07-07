'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadSaves, useStore, writeSaves } from '@/lib/store';
import { fmtDate, snapshot, uid } from '@/lib/logic';
import type { SaveSlot } from '@/lib/types';
import { Banner, Card, Pill } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyNote } from '@/components/EmptyState';
import { Confirm, Prompt } from '@/components/Modal';
import { toast } from '@/components/Toast';

export default function SavesPage() {
  const data = useStore((s) => s.data);
  const applySnapshot = useStore((s) => s.applySnapshot);
  const router = useRouter();
  const [saves, setSaves] = useState<SaveSlot[] | null>(null);
  const [confirmState, setConfirmState] = useState<{ msg: string; danger?: boolean; ok: () => void } | null>(null);
  const [promptState, setPromptState] = useState<{ title: string; initial: string; ok: (v: string) => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaves(loadSaves());
  }, []);
  const refresh = () => setSaves(loadSaves());

  function saveNew() {
    const def = (data.title || '大会') + ' ' + fmtDate(new Date().toISOString());
    setPromptState({
      title: '保存名を入力',
      initial: def,
      ok: (name) => {
        const arr = loadSaves();
        arr.push({ id: uid(), name: name.trim() || def, savedAt: new Date().toISOString(), payload: snapshot(data) });
        writeSaves(arr);
        refresh();
        toast('保存しました');
      },
    });
  }

  function exportSave(s: SaveSlot) {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (s.name || 'taikousen').replace(/[\\/:*?"<>|]/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // 参照実装と相互互換：payload形式（保存スロット）と素のdata形式の両方を受理
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const entry =
        obj && obj.payload && obj.payload.teams
          ? { name: obj.name as string | undefined, payload: obj.payload }
          : obj && obj.teams
            ? {
                name: (obj.title as string) || f.name.replace(/\.json$/i, ''),
                payload: {
                  teams: obj.teams,
                  players: obj.players || [],
                  matchups: obj.matchups || [],
                  matches: obj.matches || [],
                  courtCount: obj.courtCount || 4,
                  title: obj.title || '',
                },
              }
            : null;
      if (!entry) {
        toast('対応していないファイル形式です');
        return;
      }
      const arr = loadSaves();
      arr.push({ id: uid(), name: entry.name || '読込データ', savedAt: new Date().toISOString(), payload: entry.payload });
      writeSaves(arr);
      refresh();
      toast('保存データに追加しました');
    } catch (err) {
      toast('読み込み失敗: ' + ((err as Error)?.message || String(err)));
    }
  }

  const sorted = (saves ?? []).slice().sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));

  return (
    <div>
      <Banner className="mb-4">
        現在の大会データに名前を付けて保存し、あとから読み込めます。保存先はこのブラウザ内です。
        別の端末／ブラウザへ移すときは「書出」でファイルに書き出し、移行先で「ファイルから読み込む」を使ってください。
      </Banner>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={saveNew}>＋ 現在の大会を保存</Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>ファイルから読み込む</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
      </div>

      {saves === null ? (
        <EmptyNote>読み込み中…</EmptyNote>
      ) : sorted.length === 0 ? (
        <EmptyNote>保存データはありません</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((s) => {
            const p = s.payload || ({} as SaveSlot['payload']);
            return (
              <Card key={s.id} className="p-3.5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <b className="text-[15px]">{s.name || '(無名)'}</b>
                  <span className="text-xs text-mute">{s.savedAt ? fmtDate(s.savedAt) : ''}</span>
                </div>
                <div className="mb-2.5">
                  <Pill>
                    {(p.teams || []).length}チーム / {(p.matchups || []).length}対抗戦 / {(p.matches || []).length}試合
                  </Pill>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      setConfirmState({
                        msg: `「${s.name}」を読み込みます。現在の表示中データは置き換わります（保存済みデータは消えません）。`,
                        ok: () => {
                          applySnapshot(s.payload);
                          toast('読み込みました');
                          router.push('/');
                        },
                      })
                    }
                  >
                    読み込む
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setConfirmState({
                        msg: `「${s.name}」を現在のデータで上書きしますか？`,
                        ok: () => {
                          const arr = loadSaves();
                          const t = arr.find((x) => x.id === s.id);
                          if (t) {
                            t.payload = snapshot(data);
                            t.savedAt = new Date().toISOString();
                            writeSaves(arr);
                            refresh();
                            toast('上書きしました');
                          }
                        },
                      })
                    }
                  >
                    上書き
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setPromptState({
                        title: '新しい名前',
                        initial: s.name,
                        ok: (name) => {
                          const arr = loadSaves();
                          const t = arr.find((x) => x.id === s.id);
                          if (t) {
                            t.name = name.trim() || t.name;
                            writeSaves(arr);
                            refresh();
                          }
                        },
                      })
                    }
                  >
                    名前
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportSave(s)}>書出</Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setConfirmState({
                        msg: 'この保存データを削除しますか？',
                        danger: true,
                        ok: () => {
                          writeSaves(loadSaves().filter((x) => x.id !== s.id));
                          refresh();
                          toast('削除しました');
                        },
                      })
                    }
                  >
                    削除
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirmState && (
        <Confirm
          message={confirmState.msg}
          danger={confirmState.danger}
          onOk={confirmState.ok}
          onClose={() => setConfirmState(null)}
        />
      )}
      {promptState && (
        <Prompt
          title={promptState.title}
          initial={promptState.initial}
          onOk={promptState.ok}
          onClose={() => setPromptState(null)}
        />
      )}
    </div>
  );
}
