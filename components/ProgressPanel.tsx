'use client';

import React from 'react';
import type { Progress } from '@/lib/pacing';
import { fmtClock, fmtSpan } from '@/lib/pacing';

// 残り試合数と終了見込み。合宿では「今日中に終わるのか」が常に問題になる
export function ProgressPanel({ p, courts, now }: { p: Progress; courts: number; now: number }) {
  const ratio = p.total ? p.done / p.total : 0;
  return (
    <div className="mb-4 rounded-2xl border border-line bg-panel p-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-mute">残り試合</div>
          <div className="font-num text-2xl font-extrabold leading-none">
            {p.remaining}
            <span className="ml-1 text-sm font-bold text-mute">/ {p.total}</span>
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wide text-mute">終了見込み</div>
          <div className="font-num text-2xl font-extrabold leading-none text-neon">
            {p.finishAt ? fmtClock(p.finishAt) : '—'}
          </div>
        </div>
      </div>

      <div className="my-2 h-1.5 overflow-hidden rounded-full bg-panel2">
        <div className="h-full rounded-full bg-neon transition-all" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>

      <div className="text-[11px] font-bold leading-relaxed text-mute">
        完了 {p.done} ・ 進行中 {p.live} ・ {courts}面
        {p.finishAt && <> ・ あと{fmtSpan((p.finishAt - now) / 60000)}</>}
        <br />
        1試合 平均{p.avgMin}分
        {p.measured ? `（完了${p.sampleCount}試合の実測）` : '（実測がまだ無いため目安）'}
      </div>
    </div>
  );
}
