'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { matchLabel, muById, muLabel, names, teamColor } from '@/lib/logic';
import { Modal, ModalActions } from './Modal';
import { Button } from './Button';
import { toast } from './Toast';

const GAME_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

// 7-6 / 6-7（＝どちらかが7、もう一方が6）のときだけタイブレーク入力を出す
function isTiebreak(a: number, b: number): boolean {
  return Math.max(a, b) === 7 && Math.min(a, b) === 6;
}

// スコア片側の入力（選手名＋ゲーム数プルダウン）
function GameSelect({ name, color, value, onChange }: {
  name: string;
  color?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-panel2 px-2 py-4">
      <div className="flex min-h-9 items-center text-center text-[13px] font-extrabold leading-tight" style={{ color }}>
        {name}
      </div>
      <select
        aria-label={`${name} のゲーム数`}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-num h-16 w-full rounded-xl border border-line bg-panel text-center text-4xl font-extrabold text-ink"
      >
        {GAME_OPTIONS.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <span className="text-[10px] font-bold text-mute">ゲーム</span>
    </div>
  );
}

// finish: live試合の結果入力（done化）。edit: done試合のスコア修正
export function ScoreDialog({ matchId, mode, onClose }: {
  matchId: string;
  mode: 'finish' | 'edit';
  onClose: () => void;
}) {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const m = data.matches.find((x) => x.id === matchId);
  const [a, setA] = useState(m?.scoreA ?? 0);
  const [b, setB] = useState(m?.scoreB ?? 0);
  const [tbA, setTbA] = useState<string>(m?.tbA != null ? String(m.tbA) : '');
  const [tbB, setTbB] = useState<string>(m?.tbB != null ? String(m.tbB) : '');
  if (!m) return null;
  const mu = muById(data, m.matchupId)!;
  const tb = isTiebreak(a, b);
  const even = a === b;

  const commit = () => {
    mutate((d) => {
      const t = d.matches.find((x) => x.id === matchId);
      if (!t) return;
      t.scoreA = a;
      t.scoreB = b;
      // タイブレーク時のみポイントを保存。それ以外は消す
      t.tbA = tb && tbA !== '' ? Number(tbA) : null;
      t.tbB = tb && tbB !== '' ? Number(tbB) : null;
      if (mode === 'finish') {
        t.status = 'done';
        t.court = null;
      }
    });
    onClose();
    toast(mode === 'finish' ? '結果を記録しました' : 'スコアを修正しました');
  };

  return (
    <Modal title={`${matchLabel(m)} ${mode === 'finish' ? '結果入力' : 'スコア修正'}`} onClose={onClose}>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>
      <div className="grid grid-cols-2 gap-3">
        <GameSelect name={names(data, m.sideA)} color={teamColor(data, mu.aId)} value={a} onChange={setA} />
        <GameSelect name={names(data, m.sideB)} color={teamColor(data, mu.bId)} value={b} onChange={setB} />
      </div>

      {tb && (
        <div className="mt-3 rounded-2xl border border-line bg-panel2 p-3">
          <div className="mb-2 text-center text-xs font-extrabold text-mute">タイブレーク ポイント</div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              aria-label={`${names(data, m.sideA)} のタイブレーク`}
              value={tbA}
              onChange={(e) => setTbA(e.target.value)}
              className="font-num h-12 w-full rounded-xl border border-line bg-panel text-center text-2xl font-extrabold text-ink"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              aria-label={`${names(data, m.sideB)} のタイブレーク`}
              value={tbB}
              onChange={(e) => setTbB(e.target.value)}
              className="font-num h-12 w-full rounded-xl border border-line bg-panel text-center text-2xl font-extrabold text-ink"
            />
          </div>
        </div>
      )}

      {even && a > 0 && (
        <div className="mt-2 text-center text-[11px] font-bold text-warn">
          同じゲーム数です。6-6ならタイブレークの勝者を7に設定してください。
        </div>
      )}

      <ModalActions>
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="done" onClick={commit}>{mode === 'finish' ? '確定して終了' : '保存'}</Button>
      </ModalActions>
    </Modal>
  );
}
