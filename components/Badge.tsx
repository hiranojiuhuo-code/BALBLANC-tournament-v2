import React from 'react';
import type { Status } from '@/lib/types';

type Variant = 'ready' | 'busy' | 'live' | 'done' | 'muted' | 'rec' | 'warn' | 'queue';

const map: Record<Variant, string> = {
  ready: 'border-good/40 bg-good/10 text-good',
  busy: 'border-bad/40 bg-bad/10 text-bad',
  live: 'border-neon/50 bg-neon/15 text-neon',
  done: 'border-line bg-panel2 text-mute',
  muted: 'border-line bg-panel2 text-mute',
  rec: 'glow-neon border-neon/60 bg-neon/20 text-neon',
  warn: 'border-warn/45 bg-warn/12 text-warn',
  queue: 'border-cyan/45 bg-cyan/12 text-cyan',
};

export function Badge({ variant, className = '', children }: {
  variant: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${map[variant]} ${className}`}>
      {variant === 'live' && <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-neon" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  if (status === 'live') return <Badge variant="live">進行中</Badge>;
  if (status === 'done') return <Badge variant="done">完了</Badge>;
  return <Badge variant="muted">未</Badge>;
}

export function CatTag({ cat, label }: { cat: 'S' | 'D' | 'M'; label: string }) {
  const cls = {
    S: 'border-cyan/40 bg-cyan/10 text-cyan',
    D: 'border-[var(--cat-d)]/40 bg-[var(--cat-d)]/10 text-[var(--cat-d-text)]',
    M: 'border-[var(--cat-m)]/40 bg-[var(--cat-m)]/10 text-[var(--cat-m-text)]',
  }[cat];
  return <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${cls}`}>{label}</span>;
}
