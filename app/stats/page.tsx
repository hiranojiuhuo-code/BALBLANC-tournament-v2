'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { playerRecord, standings, teamColor, tName } from '@/lib/logic';
import type { Cat, PlayerGender } from '@/lib/types';
import { Card, SectionTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Chip, ChipRow } from '@/components/Chip';
import { EmptyNote, EmptyState } from '@/components/EmptyState';
import { IconChart } from '@/components/icons';

const CAT_CHIPS: [Cat | 'all', string][] = [
  ['all', 'すべて'], ['S', 'シングルス'], ['D', 'ダブルス'], ['M', 'ミックス'],
];

export default function StatsPage() {
  const data = useStore((s) => s.data);
  const [team, setTeam] = useState('all');
  const [cat, setCat] = useState<Cat | 'all'>('all');

  if (data.players.length === 0) {
    return (
      <EmptyState
        icon={<IconChart width={40} height={40} />}
        title="まだ選手がいません"
        desc="写真から取り込むかチームに選手を追加し、試合結果を入力すると個人成績が集計されます。"
      >
        <Button href="/import" variant="primary">写真から取り込み</Button>
      </EmptyState>
    );
  }

  const st = standings(data);

  function PersonTable({ g, label }: { g: PlayerGender; label: string }) {
    const ps = data.players.filter((p) => p.gender === g && (team === 'all' || p.teamId === team));
    const rows = ps
      .map((p) => {
        const r = playerRecord(data, p.id, cat);
        return { p, r, rate: r.played ? r.w / r.played : -1 };
      })
      .sort((a, b) => b.r.w - a.r.w || b.rate - a.rate || (b.r.gf - b.r.ga) - (a.r.gf - a.r.ga));
    return (
      <section className="mb-6">
        <SectionTitle>{label}</SectionTitle>
        <Card className="overflow-x-auto p-0">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>選手</th>
                <th>チーム</th>
                <th>出場</th>
                <th>勝</th>
                <th>敗</th>
                <th>勝率</th>
                <th>得失G</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8}><EmptyNote>選手がいません</EmptyNote></td></tr>
              ) : (
                rows.map((x, i) => {
                  const { p, r } = x;
                  const rate = r.played ? Math.round((r.w / r.played) * 100) + '%' : '—';
                  const diff = r.gf - r.ga;
                  return (
                    <tr key={p.id}>
                      <td className={`font-num font-extrabold ${r.played && i === 0 ? 'text-neon' : 'text-mute'}`}>
                        {r.played ? i + 1 : '—'}
                      </td>
                      <td>
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: teamColor(data, p.teamId) }} />
                        <span className="font-bold">{p.name}</span>
                      </td>
                      <td className="text-[11px] text-mute">{tName(data, p.teamId)}</td>
                      <td className="font-num">{r.played}</td>
                      <td className="font-num font-extrabold text-good">{r.w}</td>
                      <td className="font-num font-extrabold text-bad">{r.l}</td>
                      <td className="font-num font-bold">{rate}</td>
                      <td className={`font-num ${diff > 0 ? 'text-good' : diff < 0 ? 'text-bad' : 'text-mute'}`}>
                        {r.played ? (diff > 0 ? `+${diff}` : diff) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </section>
    );
  }

  return (
    <div>
      <section className="mb-6">
        <SectionTitle>チーム成績</SectionTitle>
        <Card className="max-w-md overflow-x-auto p-0">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>チーム</th>
                <th>勝</th>
                <th>敗</th>
              </tr>
            </thead>
            <tbody>
              {st.length === 0 ? (
                <tr><td colSpan={4}><EmptyNote>チームがいません</EmptyNote></td></tr>
              ) : (
                st.map((s, i) => (
                  <tr key={s.id}>
                    <td className="font-num font-extrabold text-mute">{s.mw + s.ml ? i + 1 : '—'}</td>
                    <td>
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: teamColor(data, s.id) }} />
                      <b>{s.name}</b>
                    </td>
                    <td className="font-num font-extrabold text-good">{s.mw}</td>
                    <td className="font-num font-extrabold text-bad">{s.ml}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>

      <ChipRow>
        <Chip on={team === 'all'} onClick={() => setTeam('all')}>全チーム</Chip>
        {data.teams.map((t) => (
          <Chip key={t.id} on={team === t.id} onClick={() => setTeam(t.id)}>{t.name}</Chip>
        ))}
      </ChipRow>
      <ChipRow>
        {CAT_CHIPS.map(([k, label]) => (
          <Chip key={k} on={cat === k} onClick={() => setCat(k)}>{label}</Chip>
        ))}
      </ChipRow>

      <PersonTable g="M" label="男子ランキング" />
      <PersonTable g="F" label="女子ランキング" />
      <EmptyNote>完了した試合の結果から自動集計されます。</EmptyNote>
    </div>
  );
}
