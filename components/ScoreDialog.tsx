'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { matchLabel, muById, muLabel, names, teamColor } from '@/lib/logic';
import { Modal, ModalActions } from './Modal';
import { Button } from './Button';
import { toast } from './Toast';

// 通常の6ゲーム先取マッチで起こりうる最終スコア（勝者から見た形）
const WIN_SCORES: [number, number][] = [[6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [7, 5], [7, 6]];
const GAME_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];
const TB_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// finish: live試合の結果入力（done化）。edit: done試合のスコア修正
// スコアパッド方式: 最終スコアのチップをタップ→即記録（7-6のみタイブレークを続けて選択）
export function ScoreDialog({ matchId, mode, onClose }: {
  matchId: string;
  mode: 'finish' | 'edit';
  onClose: () => void;
}) {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const m = data.matches.find((x) => x.id === matchId);
  // タイブレーク待ち: 'A' | 'B'（どちらが7-6で勝ったか）
  const [pendingTb, setPendingTb] = useState<'A' | 'B' | null>(null);
  // 細かく入力モード（途中終了などの変則スコア用）
  const [custom, setCustom] = useState(false);
  const [ca, setCa] = useState(m?.scoreA ?? 0);
  const [cb, setCb] = useState(m?.scoreB ?? 0);
  const [ctbA, setCtbA] = useState<string>(m?.tbA != null ? String(m.tbA) : '');
  const [ctbB, setCtbB] = useState<string>(m?.tbB != null ? String(m.tbB) : '');
  if (!m) return null;
  const mu = muById(data, m.matchupId)!;
  const aName = names(data, m.sideA);
  const bName = names(data, m.sideB);
  const ac = teamColor(data, mu.aId);
  const bc = teamColor(data, mu.bId);

  const save = (sa: number, sb: number, tba: number | null, tbb: number | null, label: string) => {
    mutate((d) => {
      const t = d.matches.find((x) => x.id === matchId);
      if (!t) return;
      t.scoreA = sa;
      t.scoreB = sb;
      t.tbA = tba;
      t.tbB = tbb;
      if (mode === 'finish') {
        t.status = 'done';
        t.court = null;
      }
    });
    onClose();
    toast(`${matchLabel(m)}: ${label} で記録しました（試合一覧から修正できます）`);
  };

  // スコアチップをタップ。7-6はタイブレーク選択へ、それ以外は即記録
  const pick = (winner: 'A' | 'B', hi: number, lo: number) => {
    const [sa, sb] = winner === 'A' ? [hi, lo] : [lo, hi];
    if (hi === 7 && lo === 6) {
      setPendingTb(winner);
      return;
    }
    save(sa, sb, null, null, `${sa}-${sb}`);
  };

  // タイブレークの敗者ポイントをタップ→即記録
  const pickTb = (loserPts: number | null) => {
    const winner = pendingTb!;
    const winPts = loserPts == null ? null : Math.max(7, loserPts + 2);
    const [sa, sb] = winner === 'A' ? [7, 6] : [6, 7];
    const [ta, tb] = loserPts == null ? [null, null] : winner === 'A' ? [winPts, loserPts] : [loserPts, winPts];
    save(sa, sb, ta, tb, loserPts == null ? `${sa}-${sb}` : `${sa}-${sb}(${loserPts})`);
  };

  const commitCustom = () => {
    const useTb = Math.max(ca, cb) === 7 && Math.min(ca, cb) === 6;
    save(
      ca, cb,
      useTb && ctbA !== '' ? Number(ctbA) : null,
      useTb && ctbB !== '' ? Number(ctbB) : null,
      `${ca}-${cb}`,
    );
  };

  const chip =
    'font-num flex min-h-12 items-center justify-center rounded-xl border text-lg font-extrabold transition active:scale-95';

  return (
    <Modal title={`${matchLabel(m)} ${mode === 'finish' ? '結果入力' : 'スコア修正'}`} onClose={onClose}>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>

      {custom ? (
        <>
          {/* 変則スコア（途中終了など）: プルダウンで自由入力 */}
          <div className="grid grid-cols-2 gap-3">
            {([['A', aName, ac, ca, setCa], ['B', bName, bc, cb, setCb]] as const).map(([k, name, color, v, set]) => (
              <div key={k} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-panel2 px-2 py-4">
                <div className="flex min-h-9 items-center text-center text-[13px] font-extrabold leading-tight" style={{ color }}>
                  {name}
                </div>
                <select
                  aria-label={`${name} のゲーム数`}
                  value={v}
                  onChange={(e) => set(Number(e.target.value))}
                  className="font-num h-16 w-full rounded-xl border border-line bg-panel text-center text-4xl font-extrabold text-ink"
                >
                  {GAME_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-[10px] font-bold text-mute">ゲーム</span>
              </div>
            ))}
          </div>
          {Math.max(ca, cb) === 7 && Math.min(ca, cb) === 6 && (
            <div className="mt-3 rounded-2xl border border-line bg-panel2 p-3">
              <div className="mb-2 text-center text-xs font-extrabold text-mute">タイブレーク ポイント</div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number" inputMode="numeric" min={0} placeholder="0"
                  aria-label={`${aName} のタイブレーク`}
                  value={ctbA} onChange={(e) => setCtbA(e.target.value)}
                  className="font-num h-12 w-full rounded-xl border border-line bg-panel text-center text-2xl font-extrabold text-ink"
                />
                <input
                  type="number" inputMode="numeric" min={0} placeholder="0"
                  aria-label={`${bName} のタイブレーク`}
                  value={ctbB} onChange={(e) => setCtbB(e.target.value)}
                  className="font-num h-12 w-full rounded-xl border border-line bg-panel text-center text-2xl font-extrabold text-ink"
                />
              </div>
            </div>
          )}
          <ModalActions>
            <Button variant="ghost" className="mr-auto" onClick={() => setCustom(false)}>← スコアパッド</Button>
            <Button variant="ghost" onClick={onClose}>キャンセル</Button>
            <Button variant="done" onClick={commitCustom}>{mode === 'finish' ? '確定して終了' : '保存'}</Button>
          </ModalActions>
        </>
      ) : pendingTb ? (
        <>
          {/* タイブレーク: 負けた側のポイントをタップ→即記録 */}
          <div className="mb-1 text-center font-num text-3xl font-extrabold">
            <span style={{ color: pendingTb === 'A' ? ac : bc }}>7</span>
            <span className="mx-2 text-mute">-</span>
            <span>6</span>
          </div>
          <div className="mb-3 text-center text-xs font-bold text-mute">
            <b style={{ color: pendingTb === 'A' ? ac : bc }}>{pendingTb === 'A' ? aName : bName}</b> の勝ち。
            タイブレークの<b>負けた側のポイント</b>をタップ
          </div>
          <div className="grid grid-cols-5 gap-2">
            {TB_POINTS.map((p) => (
              <button key={p} type="button" onClick={() => pickTb(p)}
                className={`${chip} border-line bg-panel2 hover:border-cyan/50`}>
                {p}
              </button>
            ))}
          </div>
          <ModalActions>
            <Button variant="ghost" className="mr-auto" onClick={() => setPendingTb(null)}>← 戻る</Button>
            <Button variant="ghost" onClick={() => pickTb(null)}>ポイント記録なしで確定</Button>
          </ModalActions>
        </>
      ) : (
        <>
          {/* スコアパッド: 勝者列のスコアをワンタップで即記録 */}
          <div className="grid grid-cols-2 gap-3">
            {([['A', aName, ac], ['B', bName, bc]] as const).map(([side, name, color]) => (
              <div key={side} className="rounded-2xl border border-line bg-panel2 p-2.5">
                <div className="mb-2 text-center text-[12px] font-extrabold leading-tight" style={{ color }}>
                  {name}
                  <span className="ml-1 text-[10px] text-mute">の勝ち</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {WIN_SCORES.map(([hi, lo]) => {
                    const label = side === 'A' ? `${hi}-${lo}` : `${lo}-${hi}`;
                    const isTb = hi === 7 && lo === 6;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => pick(side, hi, lo)}
                        className={`${chip} ${isTb ? 'col-span-2' : ''} border-line bg-panel hover:border-cyan/60`}
                        style={{ color }}
                      >
                        {label}
                        {isTb && <span className="ml-1 text-[9px] font-bold text-mute">TB</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-[11px] font-bold text-mute">タップするとすぐ記録されます</div>
          <ModalActions>
            <Button variant="ghost" className="mr-auto" onClick={() => setCustom(true)}>細かく入力（途中終了など）</Button>
            <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
