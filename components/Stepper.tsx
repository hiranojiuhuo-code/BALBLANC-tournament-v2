'use client';

import React from 'react';

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
