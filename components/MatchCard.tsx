'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { matchLabel, muById, muLabel, names, pById, teamColor } from '@/lib/logic';
import type { Data, Match } from '@/lib/types';
import type { MatchPace, PlayerPace } from '@/lib/pacing';
import { Badge, CatTag } from './Badge';

/*
 * 選手名の横に残り試合数を括弧で出す。どの試合を先に入れるか決めるとき、
 * 「この人はあと何試合あるのか」がその場で分かるようにするため。
 */
function Names({ data, ids, paces }: { data: Data; ids: string[] | undefined; paces?: Map<string, PlayerPace> }) {
  if (!paces) return <>{names(data, ids)}</>;
  const arr = ids || [];
  if (arr.length === 0) return <>―</>;
  return (
    <>
      {arr.map((id, i) => {
        const rem = paces.get(id)?.remaining;
        return (
          <span key={id}>
            {i > 0 && '・'}
            {(pById(data, id) || { name: '?' }).name}
            {rem != null && <span className="font-num text-[0.8em] font-bold opacity-55">({rem})</span>}
          </span>
        );
      })}
    </>
  );
}

// 待ち時間・連戦の一行表示。運営が「次に入れてよいか」を判断する材料
function PaceLine({ pace, size }: { pace: MatchPace; size: string }) {
  if (pace.backToBack) {
    return (
      <div className={`mt-1 font-bold leading-tight text-warn ${size}`}>
        {pace.tightName} が連戦（休憩{pace.tightMin}分）
      </div>
    );
  }
  if (pace.neverPlayed) {
    return <div className={`mt-1 font-bold leading-tight text-mute ${size}`}>まだ出ていない選手あり</div>;
  }
  if (pace.waitMin != null) {
    return (
      <div className={`mt-1 font-bold leading-tight text-mute ${size}`}>
        {pace.waitName} が{pace.waitMin}分待ち
      </div>
    );
  }
  return null;
}

export function MatchCard({
  match: m, state = 'plain', conflicts = [], onClick, compact = false, className = '',
  pace, recommended = false, paces,
}: {
  match: Match;
  state?: 'ready' | 'busy' | 'plain';
  conflicts?: string[];
  onClick?: () => void;
  compact?: boolean; // 2列グリッド向けの密な表示（進行ボードの一覧用）
  className?: string;
  pace?: MatchPace; // 待ち時間・連戦の情報（進行ボードの一覧のみ）
  recommended?: boolean; // 次に入れる候補として推奨
  paces?: Map<string, PlayerPace>; // 渡すと選手名の横に残り試合数を出す
}) {
  const data = useStore((s) => s.data);
  const mu = muById(data, m.matchupId);
  if (!mu) return null;
  const ac = teamColor(data, mu.aId);
  const bc = teamColor(data, mu.bId);
  const frame = recommended
    ? 'glow-neon border-neon/70 bg-neon/8'
    : state === 'ready'
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
        {state === 'ready' && (
          <span className={`absolute bottom-2 left-0 top-2 w-1 rounded-r ${recommended ? 'bg-neon' : 'bg-good'}`} />
        )}
        <div className="truncate text-[9.5px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>
        <div className="mb-1 mt-1 flex flex-wrap items-center gap-1.5">
          <CatTag cat={m.cat} label={matchLabel(m)} />
          {recommended && <Badge variant="rec">おすすめ</Badge>}
          {state === 'ready' && !recommended && <Badge variant="ready">組める</Badge>}
          {state === 'busy' && <Badge variant="busy">試合中</Badge>}
        </div>
        <div className="text-[13.5px] font-extrabold leading-tight" style={{ color: ac }}><Names data={data} ids={m.sideA} paces={paces} /></div>
        <div className="my-0.5 flex items-center gap-1.5 text-[9px] font-extrabold tracking-[.2em] text-mute/60">
          <span className="h-px flex-1 bg-line" />VS<span className="h-px flex-1 bg-line" />
        </div>
        <div className="text-[13.5px] font-extrabold leading-tight" style={{ color: bc }}><Names data={data} ids={m.sideB} paces={paces} /></div>
        {conflicts.length > 0 ? (
          <div className="mt-1 text-[10px] font-bold leading-tight text-warn">{conflicts.join('、')} が試合中</div>
        ) : pace ? (
          <PaceLine pace={pace} size="text-[10px]" />
        ) : null}
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
        {recommended && <Badge variant="rec">おすすめ</Badge>}
        {state === 'ready' && !recommended && <Badge variant="ready">組める</Badge>}
        {state === 'busy' && <Badge variant="busy">出場者が試合中</Badge>}
      </div>
      <CatTag cat={m.cat} label={matchLabel(m)} />
      <div className="mt-1.5 text-[15px] font-extrabold leading-snug" style={{ color: ac }}>
        <Names data={data} ids={m.sideA} paces={paces} />
      </div>
      <div className="my-0.5 flex items-center gap-2 text-[10px] font-extrabold tracking-[.2em] text-mute/60">
        <span className="h-px flex-1 bg-line" />VS<span className="h-px flex-1 bg-line" />
      </div>
      <div className="text-[15px] font-extrabold leading-snug" style={{ color: bc }}>
        <Names data={data} ids={m.sideB} paces={paces} />
      </div>
      {conflicts.length > 0 ? (
        <div className="mt-1.5 text-[11px] font-bold text-warn">{conflicts.join('、')} が他コートで試合中</div>
      ) : pace ? (
        <PaceLine pace={pace} size="text-[11px]" />
      ) : null}
    </div>
  );
}
