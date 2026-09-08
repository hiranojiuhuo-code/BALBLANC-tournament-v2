'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { matchesOf, matchupScore, muLabel, standings, teamColor, tName } from '@/lib/logic';
import { Card, Pill, SectionTitle } from '@/components/Card';
import { EmptyNote, EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { IconTrophy } from '@/components/icons';

export default function StandingsPage() {
  const data = useStore((s) => s.data);

  if (data.teams.length === 0) {
    return (
      <EmptyState
        icon={<IconTrophy width={40} height={40} />}
        title="まだチームがありません"
        desc="写真から取り込むか、設定でチームと対抗戦を追加すると、ここに順位表が表示されます。"
      >
        <Button href="/import" variant="primary">写真から取り込み</Button>
      </EmptyState>
    );
  }

  const rows = standings(data);

  return (
    <div>
      <SectionTitle>チーム順位表</SectionTitle>
      <Card className="mb-6 overflow-x-auto p-0">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>チーム</th>
              <th>対抗戦</th>
              <th>試合(勝-負)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id}>
                <td className={`font-num font-extrabold ${i === 0 ? 'text-neon' : 'text-mute'}`}>{i + 1}</td>
                <td>
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: teamColor(data, s.id) }} />
                  <span className="font-bold">{s.name}</span>
                </td>
                <td className="font-num whitespace-nowrap">
                  {s.muW}勝{s.muL}敗{s.muD ? `${s.muD}分` : ''}
                </td>
                <td className="font-num whitespace-nowrap">
                  {s.mw}-{s.ml}
                  {/* ミックスの内訳。合計にも含まれている数字なので色を分ける */}
                  <span className="ml-1 text-[11px] font-bold text-[var(--cat-m-text)]">({s.mixW})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mb-0 px-4 pb-3 pt-1 text-[11px] text-mute">
          括弧内は<span className="font-bold text-[var(--cat-m-text)]">ミックスの勝利数</span>（左の勝敗にも含まれています）。
        </p>
      </Card>

      <SectionTitle>対抗戦ごとのスコア</SectionTitle>
      {data.matchups.length === 0 ? (
        <EmptyNote>対抗戦がありません</EmptyNote>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.matchups.map((mu) => {
            const s = matchupScore(data, mu.id);
            const all = matchesOf(data, mu.id);
            const done = all.filter((m) => m.status === 'done').length;
            const pct = all.length ? Math.round((done / all.length) * 100) : 0;
            return (
              <Card key={mu.id}>
                <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>
                <div className="flex items-center justify-center gap-4">
                  <span className="flex-1 text-right text-sm font-extrabold" style={{ color: teamColor(data, mu.aId) }}>
                    {tName(data, mu.aId)}
                  </span>
                  <span className="font-num rounded-xl border border-line bg-panel2 px-3 py-1 text-2xl font-extrabold">
                    {s.a} - {s.b}
                  </span>
                  <span className="flex-1 text-sm font-extrabold" style={{ color: teamColor(data, mu.bId) }}>
                    {tName(data, mu.bId)}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel2">
                  <div className="h-full rounded-full bg-cyan/70" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-mute">
                  <span>取得試合数（完了分）</span>
                  <Pill>完了 {done} / {all.length}</Pill>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
