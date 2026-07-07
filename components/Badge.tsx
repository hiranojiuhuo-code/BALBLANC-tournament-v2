import React from 'react';
import type { Status } from '@/lib/types';

type Variant = 'ready' | 'busy' | 'live' | 'done' | 'muted';

const map: Record<Variant, string> = {
  ready: 'border-good/40 bg-good/10 text-good',
  busy: 'border-bad/40 bg-bad/10 text-bad',
  live: 'border-neon/50 bg-neon/15 text-neon',
  done: 'border-white/10 bg-white/5 text-mute',
  muted: 'border-line bg-panel2 text-mute',
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
    D: 'border-[#5b8cff]/40 bg-[#5b8cff]/10 text-[#7aa5ff]',
    M: 'border-[#b78bfa]/40 bg-[#b78bfa]/10 text-[#c9a6ff]',
  }[cat];
  return <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${cls}`}>{label}</span>;
}
