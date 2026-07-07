'use client';

import React from 'react';

// スコア入力用の大型ステッパー
export function ScoreStepper({ name, color, value, onChange }: {
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
      <div className="font-num min-w-16 text-center text-5xl font-extrabold text-ink">{value}</div>
      <div className="flex gap-2.5">
        <button
          type="button"
          aria-label="減らす"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-11 w-14 rounded-xl border border-line bg-panel text-xl font-extrabold text-ink transition active:scale-95"
        >
          −
        </button>
        <button
          type="button"
          aria-label="増やす"
          onClick={() => onChange(value + 1)}
          className="glow-neon h-11 w-14 rounded-xl bg-neon text-xl font-extrabold text-white transition active:scale-95"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

// 設定画面などの小型カウントステッパー
export function CountStepper({ value, min = 1, max = 16, onChange }: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="減らす"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-11 w-11 rounded-xl border border-line bg-panel2 text-lg font-extrabold text-ink transition active:scale-95"
      >
        −
      </button>
      <span className="font-num min-w-10 text-center text-2xl font-extrabold">{value}</span>
      <button
        type="button"
        aria-label="増やす"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-11 w-11 rounded-xl border border-line bg-panel2 text-lg font-extrabold text-ink transition active:scale-95"
      >
        ＋
      </button>
    </div>
  );
}
