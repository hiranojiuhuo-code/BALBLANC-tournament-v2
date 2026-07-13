'use client';

import React, { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { matchLabel, muById, muLabel, names, teamColor } from '@/lib/logic';
import { Modal, ModalActions } from './Modal';
import { Button } from './Button';
import { toast } from './Toast';

// finish: live試合の結果入力（done化）。edit: done試合のスコア修正
// 手入力方式: inputMode="numeric" でスマホの数字テンキーを開く。1桁入力で次の欄へ自動フォーカス
export function ScoreDialog({ matchId, mode, onClose }: {
  matchId: string;
  mode: 'finish' | 'edit';
  onClose: () => void;
}) {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const m = data.matches.find((x) => x.id === matchId);
  const [a, setA] = useState<string>(m?.scoreA != null ? String(m.scoreA) : '');
  const [b, setB] = useState<string>(m?.scoreB != null ? String(m.scoreB) : '');
  const [tbA, setTbA] = useState<string>(m?.tbA != null ? String(m.tbA) : '');
  const [tbB, setTbB] = useState<string>(m?.tbB != null ? String(m.tbB) : '');
  const refB = useRef<HTMLInputElement>(null);
  const refTbA = useRef<HTMLInputElement>(null);
  if (!m) return null;
  const mu = muById(data, m.matchupId)!;
  const aName = names(data, m.sideA);
  const bName = names(data, m.sideB);
  const ac = teamColor(data, mu.aId);
  const bc = teamColor(data, mu.bId);

  const isTb = (a === '7' && b === '6') || (a === '6' && b === '7');
  const filled = a !== '' && b !== '';
  const tie = filled && a === b && a !== '0';

  const commit = () => {
    if (!filled) return;
    mutate((d) => {
      const t = d.matches.find((x) => x.id === matchId);
      if (!t) return;
      t.scoreA = Number(a);
      t.scoreB = Number(b);
      t.tbA = isTb && tbA !== '' ? Number(tbA) : null;
      t.tbB = isTb && tbB !== '' ? Number(tbB) : null;
      if (mode === 'finish') {
        t.status = 'done';
        t.court = null;
      }
    });
    onClose();
    toast(`${matchLabel(m)}: ${a}-${b} で記録しました`);
  };

  // PCのIME(日本語入力)で入る全角数字を半角化してから数字以外を除去
  const digits = (s: string) =>
    s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, '');

  // ゲーム数: 0〜7の1桁のみ。入力したら次の欄へ
  const onGame = (set: (v: string) => void, next?: React.RefObject<HTMLInputElement | null>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const c = digits(e.target.value).slice(-1);
      if (c !== '' && Number(c) > 7) return;
      set(c);
      // 次の欄へ。TB欄はこの入力で初めて描画されるため、再レンダー後にフォーカスする
      if (c !== '') setTimeout(() => next?.current?.focus(), 0);
    };

  // タイブレーク: 0〜99の2桁まで
  const onTb = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(digits(e.target.value).slice(0, 2));
  };

  const numInput =
    'font-num h-16 w-full rounded-xl border border-line bg-panel text-center text-4xl font-extrabold focus:border-cyan/60 focus:outline-none';

  return (
    <Modal title={`${matchLabel(m)} ${mode === 'finish' ? '結果入力' : 'スコア修正'}`} onClose={onClose}>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>

      <div className="grid grid-cols-2 gap-3">
        {([
          ['A', aName, ac, a, onGame(setA, refB), undefined, true],
          ['B', bName, bc, b, onGame(setB, refTbA), refB, false],
        ] as const).map(([k, name, color, v, onChange, ref, auto]) => (
          <div key={k} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-panel2 px-2 py-4">
            <div className="flex min-h-9 items-center text-center text-[13px] font-extrabold leading-tight" style={{ color }}>
              {name}
            </div>
            <input
              ref={ref}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus={auto}
              placeholder="0"
              aria-label={`${name} のゲーム数`}
              value={v}
              onChange={onChange}
              onFocus={(e) => e.target.select()}
              className={numInput}
              style={{ color }}
            />
            <span className="text-[10px] font-bold text-mute">ゲーム（0〜7）</span>
          </div>
        ))}
      </div>

      {isTb && (
        <div className="mt-3 rounded-2xl border border-line bg-panel2 p-3">
          <div className="mb-2 text-center text-xs font-extrabold text-mute">タイブレーク ポイント（任意）</div>
          <div className="grid grid-cols-2 gap-3">
            <input
              ref={refTbA}
              type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0"
              aria-label={`${aName} のタイブレーク`}
              value={tbA} onChange={onTb(setTbA)} onFocus={(e) => e.target.select()}
              className="font-num h-12 w-full rounded-xl border border-line bg-panel text-center text-2xl font-extrabold text-ink focus:border-cyan/60 focus:outline-none"
            />
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0"
              aria-label={`${bName} のタイブレーク`}
              value={tbB} onChange={onTb(setTbB)} onFocus={(e) => e.target.select()}
              className="font-num h-12 w-full rounded-xl border border-line bg-panel text-center text-2xl font-extrabold text-ink focus:border-cyan/60 focus:outline-none"
            />
          </div>
        </div>
      )}

      {tie && (
        <div className="mt-3 text-center text-xs font-bold text-warn">
          同点です。勝敗を付ける場合は勝者を 7 にしてください
        </div>
      )}

      <ModalActions>
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="done" disabled={!filled} onClick={commit}>
          {mode === 'finish' ? '確定して終了' : '保存'}
        </Button>
      </ModalActions>
    </Modal>
  );
}
