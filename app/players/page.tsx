'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { playerRecord, syncMatchups, teamColor, tName, uid } from '@/lib/logic';
import { playerPaces } from '@/lib/pacing';
import { useNow } from '@/lib/useNow';
import type { PlayerGender, Team } from '@/lib/types';
import { Badge } from '@/components/Badge';
import { Banner, Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyNote, EmptyState } from '@/components/EmptyState';
import { Confirm, Modal, ModalActions, Prompt } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { IconUsers } from '@/components/icons';

export default function PlayersPage() {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const [editPlayer, setEditPlayer] = useState<{ id: string | null; teamId: string } | null>(null);
  const [renameTeam, setRenameTeam] = useState<Team | null>(null);
  const [delTeam, setDelTeam] = useState<Team | null>(null);
  const now = useNow();

  function addTeam() {
    mutate((d) => {
      d.teams.push({ id: uid(), name: 'チーム' + (d.teams.length + 1) });
      syncMatchups(d);
    });
    toast('チームを追加しました');
  }

  if (data.teams.length === 0) {
    return (
      <EmptyState
        icon={<IconUsers width={40} height={40} />}
        title="まだチームがありません"
        desc="写真から取り込むと、チームと選手が自動で作成されます。手動で追加することもできます。"
      >
        <Button href="/import" variant="primary">写真から取り込み</Button>
        <Button variant="ghost" onClick={addTeam}>チームを手動で追加</Button>
      </EmptyState>
    );
  }

  // 「誰がいま出ているか」は運営が一番よく聞かれるので、一覧の先頭にまとめて出す
  const paces = playerPaces(data, now);
  const liveNow = data.players
    .map((p) => ({ p, court: paces.get(p.id)?.liveCourt ?? null, live: paces.get(p.id)?.live }))
    .filter((x) => x.live)
    .sort((a, b) => (a.court ?? 99) - (b.court ?? 99));

  return (
    <div>
      {liveNow.length > 0 && (
        <div className="glow-neon mb-4 rounded-2xl border border-neon/60 bg-neon/8 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-neon">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-neon" />
            いま試合中（{liveNow.length}人）
          </div>
          <div className="flex flex-wrap gap-1.5">
            {liveNow.map(({ p, court }) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-2 py-1 text-[12px] font-extrabold"
                style={{ color: teamColor(data, p.teamId) }}
              >
                {p.name}
                {court != null && <span className="font-num text-[10px] text-mute">コート{court + 1}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <Banner className="mb-4">
        選手の「編集」から名前・性別の修正と削除ができます。試合の出場者は「試合一覧」→編集 から設定します。
        勝敗の括弧内は<span className="font-bold text-[var(--cat-m-text)]">ミックスの勝利数</span>です。
      </Banner>

      <div className="grid gap-3 md:grid-cols-2">
        {data.teams.map((t) => {
          const ps = data.players.filter((p) => p.teamId === t.id);
          const liveN = ps.filter((p) => paces.get(p.id)?.live).length;
          return (
            <Card key={t.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block h-3 w-3 flex-none rounded-full" style={{ background: teamColor(data, t.id) }} />
                <h3 className="min-w-0 flex-1 truncate font-display text-base font-extrabold" style={{ color: teamColor(data, t.id) }}>
                  {t.name}（{ps.length}名）
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setRenameTeam(t)}>改名</Button>
                <Button size="sm" variant="danger" onClick={() => setDelTeam(t)}>削除</Button>
              </div>
              {/* チーム名を圧迫しないよう、出場中の表示は行を分ける */}
              {liveN > 0 && (
                <div className="mb-2">
                  <Badge variant="live">{liveN}人が試合中</Badge>
                </div>
              )}
              {ps.length === 0 ? (
                <EmptyNote>選手なし</EmptyNote>
              ) : (
                <table className="tbl">
                  <tbody>
                    {ps.map((p) => {
                      const r = playerRecord(data, p.id, 'all');
                      const mix = playerRecord(data, p.id, 'M'); // ミックスだけの内訳
                      const pace = paces.get(p.id);
                      const rem = pace?.remaining ?? 0;
                      return (
                        <tr key={p.id} className={pace?.live ? 'bg-neon/10' : undefined}>
                          <td>
                            <div className="font-bold leading-tight">{p.name}</div>
                            {/* 名前の横に置くと長い名前で折り返して行の高さがそろわないので、2行目にまとめる */}
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold leading-tight">
                              {pace?.live && (
                                <Badge variant="live" className="px-2 py-0 text-[10px]">
                                  {pace.liveCourt != null ? `コート${pace.liveCourt + 1}` : '試合中'}
                                </Badge>
                              )}
                              {rem > 0 ? (
                                <span className="text-mute">残り{rem}試合</span>
                              ) : pace?.live ? (
                                <span className="text-mute">これが最後</span>
                              ) : (
                                <span className="text-good">全試合終了</span>
                              )}
                            </div>
                          </td>
                          <td className="w-10 text-mute">{p.gender === 'M' ? '男' : p.gender === 'F' ? '女' : '-'}</td>
                          <td className="font-num w-20 whitespace-nowrap text-xs">
                            {r.played ? (
                              <>
                                <b className="text-good">{r.w}</b>
                                <span className="text-mute">-</span>
                                <b className="text-bad">{r.l}</b>
                                {/* 括弧内はミックスの勝利数（左の勝敗にも含まれる） */}
                                <span className="ml-0.5 text-[11px] font-bold text-[var(--cat-m-text)]">({mix.w})</span>
                              </>
                            ) : (
                              <span className="text-mute">—</span>
                            )}
                          </td>
                          <td className="w-20 text-right">
                            <Button size="sm" variant="ghost" onClick={() => setEditPlayer({ id: p.id, teamId: t.id })}>
                              編集
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <Button size="sm" variant="ghost" className="mt-3" onClick={() => setEditPlayer({ id: null, teamId: t.id })}>
                ＋ 選手を追加
              </Button>
            </Card>
          );
        })}
      </div>

      <Button variant="ghost" className="mt-4" onClick={addTeam}>＋ チームを追加</Button>

      {editPlayer && (
        <EditPlayerModal
          key={editPlayer.id || 'new'}
          playerId={editPlayer.id}
          teamId={editPlayer.teamId}
          onClose={() => setEditPlayer(null)}
        />
      )}
      {renameTeam && (
        <Prompt
          title={`チーム名を変更（${renameTeam.name}）`}
          initial={renameTeam.name}
          onOk={(name) => {
            mutate((d) => {
              const t = d.teams.find((x) => x.id === renameTeam.id);
              if (t) t.name = name.trim() || t.name;
            });
            toast('保存しました');
          }}
          onClose={() => setRenameTeam(null)}
        />
      )}
      {delTeam && (
        <Confirm
          message={`「${delTeam.name}」を削除しますか？関連する対抗戦・試合も消えます。`}
          danger
          onOk={() => {
            mutate((d) => {
              d.teams = d.teams.filter((t) => t.id !== delTeam.id);
              d.players = d.players.filter((p) => p.teamId !== delTeam.id);
              syncMatchups(d);
            });
            toast('削除しました');
          }}
          onClose={() => setDelTeam(null)}
        />
      )}
    </div>
  );
}

function EditPlayerModal({ playerId, teamId, onClose }: {
  playerId: string | null;
  teamId: string;
  onClose: () => void;
}) {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const p = playerId ? data.players.find((x) => x.id === playerId) : null;
  const isNew = !p;
  const [name, setName] = useState(p?.name ?? '');
  const [gender, setGender] = useState<PlayerGender>(p?.gender === 'F' ? 'F' : 'M');
  const [confirmDel, setConfirmDel] = useState(false);

  function save() {
    const nm = name.trim();
    if (!nm) {
      toast('名前を入力してください');
      return;
    }
    mutate((d) => {
      if (p) {
        const t = d.players.find((x) => x.id === p.id);
        if (t) {
          t.name = nm;
          t.gender = gender;
        }
      } else {
        d.players.push({ id: uid(), teamId, name: nm, gender });
      }
    });
    onClose();
    toast('保存しました');
  }

  return (
    <Modal title={`${isNew ? '選手を追加' : '選手を編集'}（${tName(data, teamId)}）`} onClose={onClose}>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold text-mute">名前</label>
        <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold text-mute">性別</label>
        <select className="input" value={gender} onChange={(e) => setGender(e.target.value as PlayerGender)}>
          <option value="M">男</option>
          <option value="F">女</option>
        </select>
      </div>
      <ModalActions>
        {!isNew && (
          <Button variant="danger" className="mr-auto" onClick={() => setConfirmDel(true)}>削除</Button>
        )}
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="primary" onClick={save}>保存</Button>
      </ModalActions>
      {confirmDel && (
        <Confirm
          message="この選手を削除しますか？（試合の出場者からも外れます）"
          danger
          onOk={() => {
            mutate((d) => {
              d.players = d.players.filter((x) => x.id !== p!.id);
              d.matches.forEach((m) => {
                m.sideA = m.sideA.filter((x) => x !== p!.id);
                m.sideB = m.sideB.filter((x) => x !== p!.id);
              });
            });
            onClose();
            toast('削除しました');
          }}
          onClose={() => setConfirmDel(false)}
        />
      )}
    </Modal>
  );
}
