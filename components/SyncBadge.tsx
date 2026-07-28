'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import type { SyncStatus } from '@/lib/sync';

const MAP: Record<SyncStatus, { c: string; d: string; t: string } | null> = {
  off: null,
  connecting: { c: 'text-warn', d: 'bg-warn', t: '接続中' },
  online: { c: 'text-good', d: 'bg-good', t: '同期中' },
  offline: { c: 'text-warn', d: 'bg-warn', t: 'オフライン' },
  error: { c: 'text-bad', d: 'bg-bad', t: '同期エラー' },
};

// 同期の状態表示。オフラインでも操作はできるので、失敗を強く出しすぎない
export function SyncBadge({ className = '' }: { className?: string }) {
  const st = useStore((s) => s.syncStatus);
  const v = MAP[st];
  if (!v) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-bold ${v.c} ${className}`}>
      <span className={`h-1.5 w-1.5 flex-none rounded-full ${v.d}`} />
      {v.t}
    </span>
  );
}
