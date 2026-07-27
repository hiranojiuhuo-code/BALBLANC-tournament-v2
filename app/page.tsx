'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import {
  busyPlayerIds, conflictNames, freeCourts, liveOnCourt, matchLabel, matchesOf, matchupScore,
  muById, muLabel, names, teamColor, tName,
} from '@/lib/logic';
import { matchPace, playerPaces, progressOf, recommendOrder } from '@/lib/pacing';
import { useNow } from '@/lib/useNow';
import type { Match } from '@/lib/types';
import { Badge } from '@/components/Badge';
import { Banner, Pill, SectionTitle } from '@/components/Card';
import { ProgressPanel } from '@/components/ProgressPanel';
import { Button } from '@/components/Button';
import { Chip, ChipRow } from '@/components/Chip';
import { EmptyNote, EmptyState } from '@/components/EmptyState';
import { MatchCard } from '@/components/MatchCard';
import { Modal, ModalActions } from '@/components/Modal';
import { ScoreDialog } from '@/components/ScoreDialog';
import { toast } from '@/components/Toast';
import { IconCamera } from '@/components/icons';

export default function BoardPage() {
  const data = useStore((s) => s.data);
  const loadSample = useStore((s) => s.loadSample);
  const boardMuRaw = useStore((s) => s.boardMu);
  const setBoardMu = useStore((s) => s.setBoardMu);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [finishId, setFinishId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'rec' | 'table'>('rec');
  const now = useNow();

  if (data.matchups.length === 0) {
    return (
      <EmptyState
        icon={<IconCamera width={40} height={40} />}
        title="対戦表の写真を取り込んでください"
        desc="手書きの対戦表を撮影／選択すると、チーム・対抗戦・試合を自動で作成します。複数枚をまとめてアップすると、タイトルごとに別々の対抗戦として取り込みます。"
      >
        <Button href="/import" variant="primary">写真から取り込み</Button>
        <Button variant="ghost" onClick={() => { loadSample(); toast('サンプルデータを読み込みました'); }}>
          サンプルデータで試す
        </Button>
        <Button href="/settings" variant="ghost">手動でチーム・対抗戦を追加</Button>
      </EmptyState>
    );
  }

  const curMu = boardMuRaw !== '__all' && !muById(data, boardMuRaw) ? '__all' : boardMuRaw;
  const busy = busyPlayerIds(data);
  const fc = freeCourts(data);

  let pending = data.matches.filter((m) => m.status === 'pending');
  if (curMu !== '__all') pending = pending.filter((m) => m.matchupId === curMu);
  pending = [...pending].sort(
    (a, b) =>
      data.matchups.findIndex((x) => x.id === a.matchupId) - data.matchups.findIndex((x) => x.id === b.matchupId) ||
      a.order - b.order,
  );
  const readyRaw = pending.filter((m) => conflictNames(data, m, busy).length === 0);
  const blocked = pending.filter((m) => conflictNames(data, m, busy).length > 0);
  const scope = curMu === '__all' ? data.matches : matchesOf(data, curMu);
  const selMu = curMu !== '__all' ? muById(data, curMu) : undefined;
  const selScore = selMu ? matchupScore(data, selMu.id) : null;

  // 待ち時間・連戦をもとに「次に入れる順」を決める（組み合わせ自体は変えない）
  const paces = playerPaces(data, now);
  const ready = sortMode === 'rec' ? recommendOrder(data, readyRaw, paces) : readyRaw;
  const recCount = sortMode === 'rec' ? Math.min(fc.length, ready.length) : 0;
  const prog = progressOf(scope, data.courtCount, now);

  return (
    <div>
      <ChipRow>
        <Chip on={curMu === '__all'} onClick={() => setBoardMu('__all')}>全対抗戦</Chip>
        {data.matchups.map((mu) => {
          const n = matchesOf(data, mu.id).length;
          return (
            <Chip key={mu.id} on={curMu === mu.id} onClick={() => setBoardMu(mu.id)}>
              {muLabel(data, mu)}{n ? ` (${n})` : ' (空)'}
            </Chip>
          );
        })}
      </ChipRow>

      {selMu && selScore && (
        <div className="mb-4 flex items-center gap-3 font-display text-base font-extrabold">
          <span style={{ color: teamColor(data, selMu.aId) }}>{tName(data, selMu.aId)}</span>
          <Pill className="text-base">{selScore.a} - {selScore.b}</Pill>
          <span style={{ color: teamColor(data, selMu.bId) }}>{tName(data, selMu.bId)}</span>
        </div>
      )}

      <ProgressPanel p={prog} courts={data.courtCount} now={now} />

      {/* コート（全対抗戦共通） */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: data.courtCount }, (_, i) => {
          const m = liveOnCourt(data, i);
          const started = m?.startedAt ? new Date(m.startedAt).getTime() : null;
          const elapsed = started == null ? null : Math.max(0, Math.round((now - started) / 60000));
          return (
            <div
              key={i}
              className={`court-lines relative flex min-h-36 flex-col gap-2 overflow-hidden rounded-2xl border p-3 ${
                m ? 'glow-neon border-neon/60 bg-panel2' : 'border-line bg-panel'
              }`}
            >
              <div className="relative z-10 flex items-center justify-between gap-1">
                <span className="font-display text-sm font-extrabold">コート{i + 1}</span>
                {m ? (
                  <Badge variant={elapsed != null && elapsed > prog.avgMin * 1.6 ? 'warn' : 'live'}>
                    {elapsed != null ? `${elapsed}分経過` : '進行中'}
                  </Badge>
                ) : (
                  <Badge variant="ready">空き</Badge>
                )}
              </div>
              {m ? (
                <>
                  <MatchCard match={m} className="relative z-10" />
                  <Button variant="done" className="relative z-10 w-full" onClick={() => setFinishId(m.id)}>
                    試合終了・結果入力
                  </Button>
                </>
              ) : (
                <div className="relative z-10 flex min-h-16 flex-1 items-center justify-center rounded-xl border border-dashed border-line text-xs text-mute">
                  下の試合から選択
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* いま組める試合（被りゼロ） */}
      <section className="mb-6">
        <SectionTitle>
          <span className="text-good">いま組める試合（{ready.length}）</span>
          <Pill>空きコート {fc.length}面</Pill>
          <button
            type="button"
            onClick={() => setSortMode(sortMode === 'rec' ? 'table' : 'rec')}
            className="ml-auto rounded-lg border border-line bg-panel2 px-2.5 py-1 text-[11px] font-bold text-mute active:scale-95"
          >
            {sortMode === 'rec' ? 'おすすめ順' : '対戦表の順'}
          </button>
        </SectionTitle>
        {ready.length ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {ready.map((m, i) => (
              <MatchCard
                key={m.id}
                match={m}
                state="ready"
                compact
                pace={matchPace(data, m, paces)}
                recommended={i < recCount}
                onClick={() => setAssignId(m.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyNote>なし</EmptyNote>
        )}
      </section>

      {/* 出場者が被っていて組めない試合 */}
      {blocked.length > 0 && (
        <section className="mb-6">
          <SectionTitle>
            <span className="text-warn">出場者が試合中で組めない（{blocked.length}）</span>
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {blocked.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                state="busy"
                compact
                conflicts={conflictNames(data, m, busy)}
                onClick={() => setAssignId(m.id)}
              />
            ))}
          </div>
        </section>
      )}

      <EmptyNote>
        完了 {prog.done} / 全 {prog.total} 試合
      </EmptyNote>

      {assignId && <AssignModal key={assignId} matchId={assignId} onClose={() => setAssignId(null)} />}
      {finishId && <ScoreDialog key={finishId} matchId={finishId} mode="finish" onClose={() => setFinishId(null)} />}
    </div>
  );
}

/* コート割り当てモーダル：試合タップ→コートタップの2タップで開始 */
function AssignModal({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const m = data.matches.find((x) => x.id === matchId);
  if (!m) return null;
  const busy = busyPlayerIds(data);
  const conf = conflictNames(data, m, busy);
  const fc = freeCourts(data);
  const mu = muById(data, m.matchupId)!;

  const start = (court: number) => {
    mutate((d) => {
      const t = d.matches.find((x) => x.id === matchId);
      if (t) {
        t.court = court;
        t.status = 'live';
        t.startedAt = new Date().toISOString();
        t.endedAt = null;
      }
    });
    onClose();
    toast(`コート${court + 1}で開始しました`);
  };

  return (
    <Modal title={`${matchLabel(m)} を入れる`} onClose={onClose}>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>
      <div className="mb-4 rounded-xl border border-line bg-panel2 p-3">
        <div className="text-[15px] font-extrabold" style={{ color: teamColor(data, mu.aId) }}>{names(data, m.sideA)}</div>
        <div className="my-0.5 text-[10px] font-extrabold tracking-[.2em] text-mute/60">VS</div>
        <div className="text-[15px] font-extrabold" style={{ color: teamColor(data, mu.bId) }}>{names(data, m.sideB)}</div>
      </div>
      {conf.length > 0 && (
        <Banner variant="warn" className="mb-3">
          {conf.join('、')} が現在ほかのコートで試合中です。それでも入れますか？
        </Banner>
      )}
      {fc.length === 0 ? (
        <>
          <Banner variant="danger">空いているコートがありません。先にどこかの試合を終了してください。</Banner>
          <ModalActions>
            <Button variant="ghost" onClick={onClose}>閉じる</Button>
          </ModalActions>
        </>
      ) : (
        <>
          <div className="mb-2 text-xs font-bold text-mute">入れるコートを選ぶとすぐに開始します</div>
          <div className="grid grid-cols-3 gap-2">
            {fc.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => start(i)}
                className="glow-neon min-h-12 rounded-xl bg-neon font-display text-sm font-extrabold text-[var(--on-accent)] transition active:scale-95"
              >
                コート{i + 1}
              </button>
            ))}
          </div>
          <ModalActions>
            <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
