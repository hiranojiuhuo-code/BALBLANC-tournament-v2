'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { matchLabel, muById, muLabel, names, teamColor } from '@/lib/logic';
import type { Match } from '@/lib/types';
import { Badge, CatTag } from './Badge';

export function MatchCard({ match: m, state = 'plain', conflicts = [], onClick, compact = false, className = '' }: {
  match: Match;
  state?: 'ready' | 'busy' | 'plain';
  conflicts?: string[];
  onClick?: () => void;
  compact?: boolean; // 2列グリッド向けの密な表示（進行ボードの一覧用）
  className?: string;
}) {
  const data = useStore((s) => s.data);
  const mu = muById(data, m.matchupId);
  if (!mu) return null;
  const ac = teamColor(data, mu.aId);
  const bc = teamColor(data, mu.bId);
  const frame =
    state === 'ready'
      ? 'border-good/50 bg-good/5'
      : state === 'busy'
        ? 'border-line bg-panel opacity-70 saturate-[.8]'
        : 'border-line bg-panel';
  const interactive = onClick ? 'cursor-pointer hover:border-cyan/50 active:scale-[.985]' : '';

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-xl border p-2.5 text-left transition ${frame} ${interactive} ${className}`}
      >
        {state === 'ready' && <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r bg-good" />}
        <div className="truncate text-[9.5px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>
        <div className="mb-1 mt-1 flex flex-wrap items-center gap-1.5">
          <CatTag cat={m.cat} label={matchLabel(m)} />
          {state === 'ready' && <Badge variant="ready">組める</Badge>}
          {state === 'busy' && <Badge variant="busy">試合中</Badge>}
        </div>
        <div className="text-[13.5px] font-extrabold leading-tight" style={{ color: ac }}>{names(data, m.sideA)}</div>
        <div className="my-0.5 flex items-center gap-1.5 text-[9px] font-extrabold tracking-[.2em] text-mute/60">
          <span className="h-px flex-1 bg-line" />VS<span className="h-px flex-1 bg-line" />
        </div>
        <div className="text-[13.5px] font-extrabold leading-tight" style={{ color: bc }}>{names(data, m.sideB)}</div>
        {conflicts.length > 0 && (
          <div className="mt-1 text-[10px] font-bold leading-tight text-warn">{conflicts.join('、')} が試合中</div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border p-3 text-left transition ${frame} ${interactive} ${className}`}
    >
      {state === 'ready' && <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r bg-good" />}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[10.5px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</span>
        {state === 'ready' && <Badge variant="ready">組める</Badge>}
        {state === 'busy' && <Badge variant="busy">出場者が試合中</Badge>}
      </div>
      <CatTag cat={m.cat} label={matchLabel(m)} />
      <div className="mt-1.5 text-[15px] font-extrabold leading-snug" style={{ color: ac }}>
        {names(data, m.sideA)}
      </div>
      <div className="my-0.5 flex items-center gap-2 text-[10px] font-extrabold tracking-[.2em] text-mute/60">
        <span className="h-px flex-1 bg-line" />VS<span className="h-px flex-1 bg-line" />
      </div>
      <div className="text-[15px] font-extrabold leading-snug" style={{ color: bc }}>
        {names(data, m.sideB)}
      </div>
      {conflicts.length > 0 && (
        <div className="mt-1.5 text-[11px] font-bold text-warn">{conflicts.join('、')} が他コートで試合中</div>
      )}
    </div>
  );
}
