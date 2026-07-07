'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { fmtDate, uid } from '@/lib/logic';
import { archiveAdd, archiveDel, archiveList } from '@/lib/idb';
import { buildFromExtraction, callVision, loadImageScaled, type ScaledImage } from '@/lib/vision';
import type { ArchiveEntry, BuiltMatch, BuiltMatchup } from '@/lib/types';
import { CatTag } from '@/components/Badge';
import { Banner, Card, Pill, SectionTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyNote } from '@/components/EmptyState';
import { Confirm, Modal, ModalActions } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { matchLabel } from '@/lib/logic';

function builtLabel(m: BuiltMatch): string {
  return matchLabel({ cat: m.cat, no: m.no, gender: m.gender });
}

function BuiltTables({ built }: { built: BuiltMatchup[] }) {
  return (
    <>
      {built.map((b, bi) => (
        <div key={bi} className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
            {b.aName} vs {b.bName}
            <Pill>{b.matches.length}試合</Pill>
          </div>
          <Card className="max-h-[40vh] overflow-auto p-0">
            <table className="tbl">
              <thead>
                <tr><th>種目</th><th>{b.aName}</th><th>{b.bName}</th></tr>
              </thead>
              <tbody>
                {b.matches.length === 0 ? (
                  <tr><td colSpan={3}><EmptyNote>試合なし</EmptyNote></td></tr>
                ) : (
                  b.matches.map((m, i) => (
                    <tr key={i}>
                      <td><CatTag cat={m.cat} label={builtLabel(m)} /></td>
                      <td className="font-bold">{m.aNames.join('・')}</td>
                      <td className="font-bold">{m.bNames.join('・')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      ))}
    </>
  );
}

export default function ImportPage() {
  const data = useStore((s) => s.data);
  const applyExtraction = useStore((s) => s.applyExtraction);
  const setBoardMu = useStore((s) => s.setBoardMu);
  const router = useRouter();

  const [imgs, setImgs] = useState<ScaledImage[]>([]);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState('');
  const [built, setBuilt] = useState<BuiltMatchup[] | null>(null);
  const [fromArchive, setFromArchive] = useState(false); // 再取り込み時は重複アーカイブを防止
  const [archives, setArchives] = useState<ArchiveEntry[] | null>(null);
  const [detail, setDetail] = useState<ArchiveEntry | null>(null);
  const [delArch, setDelArch] = useState<ArchiveEntry | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshArchives = useCallback(() => {
    archiveList()
      .then((l) => setArchives([...l].sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''))))
      .catch(() => setArchives([]));
  }, []);

  useEffect(() => {
    refreshArchives();
  }, [refreshArchives]);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setErr('');
    try {
      const next = [...imgs];
      for (const f of files) next.push(await loadImageScaled(f));
      setImgs(next);
    } catch {
      setErr('画像の読み込みに失敗しました');
    }
  }

  async function run() {
    setRunning(true);
    setErr('');
    try {
      const ex = await callVision(data.ai, imgs);
      setBuilt(buildFromExtraction(ex));
      setFromArchive(false);
    } catch (e) {
      setErr('読み取りに失敗しました：' + ((e as Error)?.message || String(e)) + '　APIキー・モデル名・通信を確認してください。');
    }
    setRunning(false);
  }

  function apply() {
    if (!built) return;
    // 写真と読み取り結果をアーカイブに自動保存（アーカイブからの再取り込み時は除く）
    if (!fromArchive && imgs.length) {
      archiveAdd({
        id: uid(),
        savedAt: new Date().toISOString(),
        images: imgs.map((im) => im.preview),
        built: structuredClone(built),
      }).catch(() => {});
    }
    const lastMid = applyExtraction(built);
    const multi = useStore.getState().data.matchups.length > 1;
    setBoardMu(multi ? '__all' : lastMid || '__all');
    setBuilt(null);
    setImgs([]);
    setFromArchive(false);
    toast('取り込みました');
    router.push('/');
  }

  /* ---- 読み取り結果の確認画面 ---- */
  if (built) {
    const knownNames = new Set(data.teams.map((t) => t.name.trim()));
    const seen = new Set<string>();
    const newTeams: string[] = [];
    built.forEach((b) =>
      [b.aName, b.bName].forEach((n) => {
        const k = n.trim();
        if (!knownNames.has(k) && !seen.has(k)) {
          seen.add(k);
          newTeams.push(n);
        }
      }),
    );
    return (
      <div>
        <SectionTitle>読み取り結果の確認</SectionTitle>
        <Banner className="mb-4">
          {built.length}件の対抗戦を検出。
          {newTeams.length > 0 && `新しいチーム（${newTeams.join('・')}）を作成します。`}
          <br />
          手書きのため誤読がある場合があります。取り込み後に「試合一覧」「チーム・選手」で修正できます。
        </Banner>
        {built.length === 0 && <EmptyNote>対抗戦を検出できませんでした</EmptyNote>}
        <BuiltTables built={built} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => { setBuilt(null); setFromArchive(false); }}>やり直す</Button>
          <Button variant="done" onClick={apply}>取り込む（{built.length}対抗戦）</Button>
        </div>
      </div>
    );
  }

  /* ---- 取り込み画面 ---- */
  return (
    <div>
      <SectionTitle>写真から取り込み（AI画像認識）</SectionTitle>

      {!data.ai.key ? (
        <Banner variant="warn" className="mb-4">
          先に「設定」画面で AI（Gemini無料枠など）の APIキーを登録してください。
          <div className="mt-2"><Button size="sm" variant="primary" href="/settings">設定を開く</Button></div>
        </Banner>
      ) : (
        <Card className="mb-6">
          <p className="mt-0 text-[13px] leading-relaxed text-mute">
            手書きの対戦表を撮影 or 選択（複数枚OK・同じ対抗戦のページをまとめて読み取り）。
            抽出したチーム名に該当する対抗戦へ取り込みます（なければ新規作成）。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={onFiles}
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => fileRef.current?.click()}>写真を選ぶ・撮影する</Button>
            <Button
              variant="done"
              disabled={imgs.length === 0 || running}
              onClick={run}
            >
              {running ? '解析中…' : imgs.length > 1 ? `解析する（${imgs.length}枚）` : '解析する'}
            </Button>
          </div>
          {imgs.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2.5">
              {imgs.map((im, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.preview} alt={`取り込み画像${i + 1}`} className="h-24 rounded-lg border border-line" />
                  <button
                    type="button"
                    aria-label="この画像を外す"
                    onClick={() => setImgs(imgs.filter((_, k) => k !== i))}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-bad text-xs font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {running && (
            <EmptyNote>AIが読み取り中…（{imgs.length > 1 ? `${imgs.length}枚・` : ''}10〜30秒ほど）</EmptyNote>
          )}
          {err && <Banner variant="danger">{err}</Banner>}
        </Card>
      )}

      {/* 取り込みアーカイブ */}
      <SectionTitle>取り込みアーカイブ</SectionTitle>
      <Banner className="mb-3">
        写真から取り込むたびに、写真と読み取り結果がここに自動で残ります。タップで詳細を表示。
      </Banner>
      {archives === null ? (
        <EmptyNote>読み込み中…</EmptyNote>
      ) : archives.length === 0 ? (
        <EmptyNote>まだアーカイブはありません。写真から取り込むと自動で残ります。</EmptyNote>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {archives.map((e) => {
            const mus = (e.built || []).map((b) => `${b.aName} vs ${b.bName}`).join('、');
            const nMatch = (e.built || []).reduce((s, b) => s + b.matches.length, 0);
            return (
              <div
                key={e.id}
                onClick={() => setDetail(e)}
                className="cursor-pointer rounded-xl border border-line bg-panel p-3 transition hover:border-cyan/50 active:scale-[.985]"
              >
                <div className="mb-2 flex gap-1.5 overflow-hidden rounded-lg">
                  {e.images.slice(0, 3).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" className="h-16 w-16 flex-none rounded-lg object-cover" />
                  ))}
                  {e.images.length > 3 && <Pill className="self-center">+{e.images.length - 3}</Pill>}
                </div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-mute">{fmtDate(e.savedAt)}</div>
                <div className="text-[13.5px] font-extrabold">{mus || '(内容なし)'}</div>
                <div className="text-xs text-mute">{e.images.length}枚・{nMatch}試合</div>
              </div>
            );
          })}
        </div>
      )}

      {/* アーカイブ詳細 */}
      {detail && (
        <Modal title={`${fmtDate(detail.savedAt)} の取り込み`} onClose={() => setDetail(null)} wide>
          <div className="mb-4 flex flex-col gap-2">
            {detail.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`アーカイブ画像${i + 1}`} className="w-full rounded-xl border border-line" />
            ))}
          </div>
          {detail.built?.length ? <BuiltTables built={detail.built} /> : <EmptyNote>読み取り結果なし</EmptyNote>}
          <ModalActions>
            <Button variant="danger" className="mr-auto" onClick={() => setDelArch(detail)}>削除</Button>
            <Button variant="ghost" onClick={() => setDetail(null)}>閉じる</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (detail.built) {
                  setBuilt(structuredClone(detail.built));
                  setFromArchive(true);
                  setImgs([]);
                  setDetail(null);
                  window.scrollTo({ top: 0 });
                }
              }}
            >
              この内容を再取り込み
            </Button>
          </ModalActions>
        </Modal>
      )}

      {delArch && (
        <Confirm
          message="このアーカイブを削除しますか？（写真と読み取り記録が消えます）"
          danger
          onOk={() => {
            archiveDel(delArch.id).then(() => {
              setDetail(null);
              refreshArchives();
              toast('削除しました');
            });
          }}
          onClose={() => setDelArch(null)}
        />
      )}
    </div>
  );
}
