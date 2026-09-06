'use client';

import React from 'react';

/*
 * 想定外の不具合で画面が真っ白になるのを防ぐ。
 * 合宿の最中に何も操作できなくなるのが一番困るので、
 * 「データは消えていない」ことと復帰の手段だけを伝える。
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h2 className="font-display mb-2 text-lg font-extrabold">画面の表示でエラーが起きました</h2>
      <p className="mb-4 text-[13px] leading-relaxed text-mute">
        保存されている大会データは消えていません。まず「再表示」を試してください。
        直らない場合は「保存データ」画面からバックアップを書き出してから、運営に連絡してください。
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="glow-neon min-h-11 rounded-xl bg-neon px-4 text-sm font-bold text-[var(--on-accent)] active:scale-95"
        >
          再表示
        </button>
        <button
          type="button"
          onClick={() => location.reload()}
          className="min-h-11 rounded-xl border border-line bg-panel2 px-4 text-sm font-bold text-ink active:scale-95"
        >
          再読み込み
        </button>
        <a
          href="/saves"
          className="inline-flex min-h-11 items-center rounded-xl border border-line bg-panel2 px-4 text-sm font-bold text-ink active:scale-95"
        >
          保存データ
        </a>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-panel2 p-2 text-left text-[10px] leading-snug text-mute">
        {error.message}{error.digest ? `\n(${error.digest})` : ''}
      </pre>
    </div>
  );
}
