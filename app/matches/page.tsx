'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { CATS, matchLabel, matchesOf, muById, muLabel, names, teamColor, tName, uid } from '@/lib/logic';
import type { Cat, Match, MatchGender } from '@/lib/types';
import { CatTag, StatusBadge } from '@/components/Badge';
import { Banner, Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Chip, ChipRow } from '@/components/Chip';
import { EmptyNote } from '@/components/EmptyState';
import { Confirm, Modal, ModalActions } from '@/components/Modal';
import { ScoreDialog } from '@/components/ScoreDialog';
import { toast } from '@/components/Toast';
import { IconDown, IconUp } from '@/components/icons';

const FILTERS: [string, string][] = [
  ['all', 'すべて'], ['S', 'S'], ['D', 'D'], ['M', 'ミックス'],
  ['pending', '未'], ['live', '進行中'], ['done', '完了'],
];

export default function MatchesPage() {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const [listMu, setListMu] = useState('all');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<string | null>(null); // match id
  const [adding, setAdding] = useState(false);
  const [scoreId, setScoreId] = useState<string | null>(null);

  let ms = data.matches.slice();
  if (listMu !== 'all') ms = ms.filter((m) => m.matchupId === listMu);
  if (['S', 'D', 'M'].includes(filter)) ms = ms.filter((m) => m.cat === filter);
  if (['pending', 'live', 'done'].includes(filter)) ms = ms.filter((m) => m.status === filter);
  ms.sort(
    (a, b) =>
      data.matchups.findIndex((x) => x.id === a.matchupId) - data.matchups.findIndex((x) => x.id === b.matchupId) ||
      a.order - b.order,
  );

  // 同じ対抗戦内で順序を入れ替える
  function move(id: string, dir: -1 | 1) {
    mutate((d) => {
      const m = d.matches.find((x) => x.id === id);
      if (!m) return;
      const sibs = d.matches.filter((x) => x.matchupId === m.matchupId).sort((a, b) => a.order - b.order);
      sibs.forEach((x, k) => (x.order = k));
      const i = sibs.findIndex((x) => x.id === id);
      const j = i + dir;
      if (j < 0 || j >= sibs.length) return;
      sibs[i].order = j;
      sibs[j].order = i;
    });
  }

  return (
    <div>
      <Button variant="primary" className="mb-3" onClick={() => setAdding(true)}>＋ 試合を追加</Button>

      <ChipRow>
        <Chip on={listMu === 'all'} onClick={() => setListMu('all')}>全対抗戦</Chip>
        {data.matchups.map((mu) => {
          const n = matchesOf(data, mu.id).length;
          return (
            <Chip key={mu.id} on={listMu === mu.id} onClick={() => setListMu(mu.id)}>
              {muLabel(data, mu)}{n ? ` (${n})` : ' (空)'}
            </Chip>
          );
        })}
      </ChipRow>
      <ChipRow>
        {FILTERS.map(([k, label]) => (
          <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{label}</Chip>
        ))}
      </ChipRow>

      {ms.length === 0 ? (
        <EmptyNote>該当する試合はありません</EmptyNote>
      ) : (
        <div className="flex flex-col gap-2">
          {ms.map((m) => {
            const mu = muById(data, m.matchupId)!;
            const aw = m.status === 'done' && m.scoreA != null && (m.scoreA as number) > (m.scoreB as number);
            const bw = m.status === 'done' && m.scoreA != null && (m.scoreB as number) > (m.scoreA as number);
            return (
              <Card key={m.id} className="flex items-center gap-3 p-3">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label="上へ"
                    onClick={() => move(m.id, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-panel2 text-mute active:scale-95"
                  >
                    <IconUp width={14} height={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="下へ"
                    onClick={() => move(m.id, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-panel2 text-mute active:scale-95"
                  >
                    <IconDown width={14} height={14} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-mute">
                    {muLabel(data, mu)}
                    <StatusBadge status={m.status} />
                    {m.status === 'live' && m.court != null && <span className="text-neon">コート{m.court + 1}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CatTag cat={m.cat} label={matchLabel(m)} />
                    <span className="text-sm font-extrabold" style={{ color: teamColor(data, mu.aId) }}>
                      {names(data, m.sideA) || '―'}
                    </span>
                    <span className="text-[10px] font-extrabold tracking-widest text-mute/60">vs</span>
                    <span className="text-sm font-extrabold" style={{ color: teamColor(data, mu.bId) }}>
                      {names(data, m.sideB) || '―'}
                    </span>
                    {m.status === 'done' && m.scoreA != null && (
                      <span className="font-num text-sm font-extrabold">
                        <span style={{ color: aw ? teamColor(data, mu.aId) : undefined }}>{m.scoreA}</span>
                        <span className="mx-1 text-mute">-</span>
                        <span style={{ color: bw ? teamColor(data, mu.bId) : undefined }}>{m.scoreB}</span>
                        {m.tbA != null && m.tbB != null && (
                          <sup className="ml-0.5 text-[9px] text-mute">({Math.min(m.tbA, m.tbB)})</sup>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(m.id)}>編集</Button>
                  {m.status === 'done' && (
                    <Button size="sm" variant="ghost" onClick={() => setScoreId(m.id)}>スコア</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(editing || adding) && (
        <EditMatchModal
          key={editing || 'new'}
          matchId={editing}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
      {scoreId && <ScoreDialog key={scoreId} matchId={scoreId} mode="edit" onClose={() => setScoreId(null)} />}
    </div>
  );
}

/* 試合の追加・編集モーダル。選手ピッカーは対戦カードの所属チームの選手のみ表示 */
function EditMatchModal({ matchId, onClose }: { matchId: string | null; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const m = matchId ? data.matches.find((x) => x.id === matchId) : null;
  const isNew = !m;
  const [form, setForm] = useState(() =>
    m
      ? { matchupId: m.matchupId, cat: m.cat, no: m.no, gender: m.gender, sideA: [...m.sideA], sideB: [...m.sideB] }
      : {
          matchupId: data.matchups[0]?.id ?? '',
          cat: 'S' as Cat,
          no: 1,
          gender: 'M' as MatchGender,
          sideA: [] as string[],
          sideB: [] as string[],
        },
  );
  const [confirmDel, setConfirmDel] = useState(false);

  if (isNew && data.matchups.length === 0) {
    return (
      <Modal title="試合を追加" onClose={onClose}>
        <Banner variant="warn">先に対抗戦が必要です。写真を取り込むか、設定でチームと対抗戦を追加してください。</Banner>
        <ModalActions>
          <Button variant="ghost" onClick={onClose}>閉じる</Button>
          <Button variant="primary" href="/import">写真から取り込み</Button>
        </ModalActions>
      </Modal>
    );
  }

  const mu = muById(data, form.matchupId);
  const size = form.cat === 'S' ? 1 : 2;

  function setSide(side: 'A' | 'B', idx: number, v: string) {
    setForm((f) => {
      const arr = [...(side === 'A' ? f.sideA : f.sideB)];
      arr[idx] = v;
      return side === 'A' ? { ...f, sideA: arr } : { ...f, sideB: arr };
    });
  }

  function picker(side: 'A' | 'B') {
    if (!mu) return null;
    const teamId = side === 'A' ? mu.aId : mu.bId;
    const arr = side === 'A' ? form.sideA : form.sideB;
    const ps = data.players.filter((p) => p.teamId === teamId);
    return (
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: size }, (_, i) => (
          <select key={i} className="input" value={arr[i] || ''} onChange={(e) => setSide(side, i, e.target.value)}>
            <option value="">―</option>
            {ps.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ))}
      </div>
    );
  }

  function save() {
    const sideA = form.sideA.slice(0, size).filter(Boolean);
    const sideB = form.sideB.slice(0, size).filter(Boolean);
    mutate((d) => {
      if (m) {
        const t = d.matches.find((x) => x.id === m.id);
        if (t) Object.assign(t, { matchupId: form.matchupId, cat: form.cat, no: form.no || 1, gender: form.gender, sideA, sideB });
      } else {
        d.matches.push({
          id: uid(), matchupId: form.matchupId, cat: form.cat, no: form.no || 1, gender: form.gender,
          order: d.matches.length, sideA, sideB, court: null, status: 'pending', scoreA: null, scoreB: null,
        } as Match);
      }
    });
    onClose();
    toast('保存しました');
  }

  return (
    <Modal title={isNew ? '試合を追加' : '試合を編集'} onClose={onClose}>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold text-mute">対抗戦</label>
        {isNew ? (
          <select
            className="input"
            value={form.matchupId}
            onChange={(e) => setForm((f) => ({ ...f, matchupId: e.target.value, sideA: [], sideB: [] }))}
          >
            {data.matchups.map((x) => (
              <option key={x.id} value={x.id}>{muLabel(data, x)}</option>
            ))}
          </select>
        ) : (
          <div className="inline-block rounded-md border border-line bg-panel2 px-2.5 py-1 text-sm font-bold">
            {muLabel(data, mu)}
          </div>
        )}
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <div>
          <label className="mb-1 block text-xs font-bold text-mute">種目</label>
          <select
            className="input"
            value={form.cat}
            onChange={(e) => setForm((f) => ({ ...f, cat: e.target.value as Cat }))}
          >
            {Object.entries(CATS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-mute">番号</label>
          <input
            type="number"
            min={1}
            className="input"
            value={form.no}
            onChange={(e) => setForm((f) => ({ ...f, no: +e.target.value || 1 }))}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold text-mute">区分</label>
        <select
          className="input"
          value={form.gender}
          onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as MatchGender }))}
        >
          <option value="M">男子</option>
          <option value="F">女子</option>
          <option value="X">混合</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold" style={{ color: mu ? teamColor(data, mu.aId) : undefined }}>
          {mu ? tName(data, mu.aId) : 'A側'}
        </label>
        {picker('A')}
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-bold" style={{ color: mu ? teamColor(data, mu.bId) : undefined }}>
          {mu ? tName(data, mu.bId) : 'B側'}
        </label>
        {picker('B')}
      </div>
      <ModalActions>
        {!isNew && (
          <>
            <Button variant="danger" className="mr-auto" onClick={() => setConfirmDel(true)}>削除</Button>
            {m!.status !== 'pending' && (
              <Button
                variant="ghost"
                onClick={() => {
                  mutate((d) => {
                    const t = d.matches.find((x) => x.id === m!.id);
                    if (t) {
                      t.status = 'pending';
                      t.court = null;
                      t.scoreA = null;
                      t.scoreB = null;
                      t.tbA = null;
                      t.tbB = null;
                    }
                  });
                  onClose();
                  toast('「未」に戻しました');
                }}
              >
                「未」に戻す
              </Button>
            )}
          </>
        )}
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="primary" onClick={save}>保存</Button>
      </ModalActions>
      {confirmDel && (
        <Confirm
          message="この試合を削除しますか？"
          danger
          onOk={() => {
            mutate((d) => {
              d.matches = d.matches.filter((x) => x.id !== m!.id);
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
