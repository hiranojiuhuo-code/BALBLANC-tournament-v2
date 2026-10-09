'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { muId, parseNames, syncMatchups, uid } from '@/lib/logic';
import type { PlayerGender } from '@/lib/types';
import { Banner, Card, SectionTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Confirm } from '@/components/Modal';
import { toast } from '@/components/Toast';

interface TeamForm { name: string; men: string; women: string }
const emptyTeam = (): TeamForm => ({ name: '', men: '', women: '' });

/*
 * 写真取り込みを使わずに、手入力で大会を作る画面。
 * 選手は1人ずつモーダルで足すと時間がかかるので、名簿をまとめて貼れるようにしている。
 */
export default function SetupPage() {
  const router = useRouter();
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const [title, setTitle] = useState('');
  const [teams, setTeams] = useState<TeamForm[]>([emptyTeam(), emptyTeam()]);
  const [confirm, setConfirm] = useState(false);

  const hasData = data.teams.length > 0 || data.matches.length > 0;
  const set = (i: number, patch: Partial<TeamForm>) =>
    setTeams((ts) => ts.map((t, k) => (k === i ? { ...t, ...patch } : t)));

  const counts = teams.map((t) => parseNames(t.men).length + parseNames(t.women).length);
  const total = counts.reduce((a, b) => a + b, 0);

  function validate(): string | null {
    const names = teams.map((t) => t.name.trim());
    if (names.some((n) => !n)) return 'チーム名をすべて入力してください';
    if (new Set(names).size !== names.length) return 'チーム名が重複しています';
    if (total === 0) return '選手を1人以上入力してください';
    return null;
  }

  function submit() {
    const err = validate();
    if (err) { toast(err); return; }
    if (hasData && !confirm) { setConfirm(true); return; }

    // 同期でやり直されても同じ結果になるよう、idは先に決めておく
    const pool = Array.from({ length: total + teams.length + 8 }, () => uid());
    mutate((d) => {
      let pi = 0;
      const nid = () => pool[pi++] ?? uid();
      d.teams = [];
      d.players = [];
      d.matchups = [];
      d.matches = [];
      if (title.trim()) d.title = title.trim();

      const made = teams.map((t) => {
        const team = { id: nid(), name: t.name.trim() };
        d.teams.push(team);
        const add = (list: string[], gender: PlayerGender) =>
          list.forEach((name) => {
            if (!d.players.some((p) => p.teamId === team.id && p.name === name)) {
              d.players.push({ id: nid(), teamId: team.id, name, gender });
            }
          });
        add(parseNames(t.men), 'M');
        add(parseNames(t.women), 'F');
        return team;
      });

      // 3チーム以上なら総当たりの組み合わせを作る。不要な分は設定から消せる
      for (let a = 0; a < made.length; a++) {
        for (let b = a + 1; b < made.length; b++) {
          d.matchups.push({ id: muId(made[a].id, made[b].id), aId: made[a].id, bId: made[b].id });
        }
      }
      syncMatchups(d);
    });
    setConfirm(false);
    toast('チームと選手を作成しました。続けて試合を追加してください');
    router.push('/matches');
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <SectionTitle>手入力で大会を作る</SectionTitle>

      {hasData ? (
        <Banner variant="warn">
          いまのデータ（チーム{data.teams.length}・試合{data.matches.length}）は<b>すべて置き換わります</b>。
          残しておきたい場合は先に「保存データ」で保存してください。
        </Banner>
      ) : (
        <Banner>
          チームと選手をここで作り、そのあと「試合」画面で対戦カードを1つずつ追加します。
          写真から取り込む場合はこの画面は不要です。
        </Banner>
      )}

      <Card>
        <label className="mb-1 block text-xs font-bold text-mute">大会名（任意）</label>
        <input
          type="text"
          className="input"
          placeholder="例: 秋合宿 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Card>

      {teams.map((t, i) => (
        <Card key={i}>
          <div className="mb-3 flex items-center gap-2">
            <SectionTitle className="mb-0 flex-1">チーム{i + 1}</SectionTitle>
            <span className="font-num text-[11px] font-bold text-mute">{counts[i]}名</span>
            {teams.length > 2 && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => setTeams((ts) => ts.filter((_, k) => k !== i))}
              >
                削除
              </Button>
            )}
          </div>

          <label className="mb-1 block text-xs font-bold text-mute">チーム名</label>
          <input
            type="text"
            className="input mb-3"
            placeholder="例: あじさい"
            value={t.name}
            onChange={(e) => set(i, { name: e.target.value })}
          />

          <label className="mb-1 block text-xs font-bold text-mute">男子選手（1行に1人）</label>
          <textarea
            className="input mb-3 min-h-32 leading-relaxed"
            placeholder={'ゆうき\nりき\nこうた'}
            value={t.men}
            onChange={(e) => set(i, { men: e.target.value })}
          />

          <label className="mb-1 block text-xs font-bold text-mute">女子選手（1行に1人）</label>
          <textarea
            className="input min-h-32 leading-relaxed"
            placeholder={'たまお\nもえ'}
            value={t.women}
            onChange={(e) => set(i, { women: e.target.value })}
          />
        </Card>
      ))}

      <Button variant="ghost" onClick={() => setTeams((ts) => [...ts, emptyTeam()])}>
        ＋ チームを追加
      </Button>

      <Card>
        <p className="mt-0 text-xs leading-relaxed text-mute">
          {teams.length}チーム・合計{total}名で作成します。
          {teams.length > 2 && '3チーム以上なので、総当たりの対抗戦をすべて作ります（不要な分は設定から削除できます）。'}
        </p>
        <Button variant="primary" className="w-full" onClick={submit}>
          この内容で作成する
        </Button>
      </Card>

      {confirm && (
        <Confirm
          message="いまのチーム・試合データをすべて消して作り直します。よろしいですか？"
          danger
          onOk={submit}
          onClose={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
