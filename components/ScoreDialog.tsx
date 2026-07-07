'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { matchLabel, muById, muLabel, names, teamColor } from '@/lib/logic';
import { Modal, ModalActions } from './Modal';
import { Button } from './Button';
import { ScoreStepper } from './Stepper';
import { toast } from './Toast';

// finish: live試合の結果入力（done化）。edit: done試合のスコア修正
export function ScoreDialog({ matchId, mode, onClose }: {
  matchId: string;
  mode: 'finish' | 'edit';
  onClose: () => void;
}) {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const m = data.matches.find((x) => x.id === matchId);
  const [a, setA] = useState(m?.scoreA ?? 0);
  const [b, setB] = useState(m?.scoreB ?? 0);
  if (!m) return null;
  const mu = muById(data, m.matchupId)!;

  const commit = () => {
    mutate((d) => {
      const t = d.matches.find((x) => x.id === matchId);
      if (!t) return;
      t.scoreA = a;
      t.scoreB = b;
      if (mode === 'finish') {
        t.status = 'done';
        t.court = null;
      }
    });
    onClose();
    toast(mode === 'finish' ? '結果を記録しました' : 'スコアを修正しました');
  };

  return (
    <Modal title={`${matchLabel(m)} ${mode === 'finish' ? '結果入力' : 'スコア修正'}`} onClose={onClose}>
      <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-mute">{muLabel(data, mu)}</div>
      <div className="grid grid-cols-2 gap-3">
        <ScoreStepper name={names(data, m.sideA)} color={teamColor(data, mu.aId)} value={a} onChange={setA} />
        <ScoreStepper name={names(data, m.sideB)} color={teamColor(data, mu.bId)} value={b} onChange={setB} />
      </div>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="done" onClick={commit}>{mode === 'finish' ? '確定して終了' : '保存'}</Button>
      </ModalActions>
    </Modal>
  );
}
