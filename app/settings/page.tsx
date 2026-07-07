'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ensureMatchup, muLabel, syncMatchups, teamColor } from '@/lib/logic';
import { THEMES } from '@/lib/themes';
import { DEFAULT_MODELS } from '@/lib/vision';
import type { Matchup, Provider } from '@/lib/types';
import { Banner, Card, SectionTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { CountStepper } from '@/components/Stepper';
import { Confirm, Prompt } from '@/components/Modal';
import { toast } from '@/components/Toast';

const PROVIDER_HELP: Record<Provider, React.ReactNode> = {
  gemini: (
    <>
      無料枠あり。<a className="font-bold text-cyan underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> でキー取得。
      429エラー時はモデル名を gemini-2.5-flash 等に変更。
    </>
  ),
  claude: (
    <>
      有料。<a className="font-bold text-cyan underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Anthropic Console</a> で取得。高精度。
    </>
  ),
  openai: (
    <>
      有料。<a className="font-bold text-cyan underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI</a> で取得。
    </>
  ),
};

export default function SettingsPage() {
  const data = useStore((s) => s.data);
  const mutate = useStore((s) => s.mutate);
  const resetAll = useStore((s) => s.resetAll);
  const resetStatus = useStore((s) => s.resetStatus);
  const loadSample = useStore((s) => s.loadSample);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  const [title, setTitle] = useState(data.title);
  const [courts, setCourts] = useState(data.courtCount);
  const [ai, setAi] = useState({ ...data.ai });
  const [muA, setMuA] = useState(data.teams[0]?.id ?? '');
  const [muB, setMuB] = useState(data.teams[1]?.id ?? '');
  const [confirmState, setConfirmState] = useState<{ msg: string; danger?: boolean; ok: () => void } | null>(null);
  const [linkPrompt, setLinkPrompt] = useState<string | null>(null);
  const [delMu, setDelMu] = useState<Matchup | null>(null);

  function saveBasic() {
    mutate((d) => {
      d.title = title;
      d.courtCount = Math.max(1, Math.min(16, courts || 4));
    });
    toast('保存しました');
  }

  function addMatchup() {
    if (!muA || !muB || muA === muB) {
      toast('異なる2チームを選んでください');
      return;
    }
    mutate((d) => {
      ensureMatchup(d, muA, muB);
      syncMatchups(d);
    });
    toast('対抗戦を追加しました');
  }

  function saveAi() {
    mutate((d) => {
      d.ai.provider = ai.provider;
      d.ai.key = ai.key.trim();
      d.ai.model = ai.model.trim();
    });
    toast('保存しました');
  }

  function copySetupLink() {
    const u =
      location.origin + location.pathname +
      '#k=' + encodeURIComponent(data.ai.key) +
      '&p=' + encodeURIComponent(data.ai.provider) +
      '&m=' + encodeURIComponent(data.ai.model);
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject())
      .then(() => toast('リンクをコピーしました'))
      .catch(() => setLinkPrompt(u));
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Card>
        <SectionTitle>テーマ（着せ替え）</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTheme(t.id);
                  toast(`${t.name}に着せ替えました`);
                }}
                className={`flex min-h-11 flex-col items-center gap-2 rounded-xl border p-3 transition active:scale-[.97] ${
                  active ? 'glow-neon border-neon bg-neon/10' : 'border-line bg-panel2 hover:border-cyan/50'
                }`}
              >
                <span className="flex overflow-hidden rounded-full border border-line">
                  {t.swatch.map((c) => (
                    <span key={c} className="h-5 w-5" style={{ background: c }} />
                  ))}
                </span>
                <span className="text-xs font-extrabold leading-tight">{t.name}</span>
                <span className="text-[10px] leading-tight text-mute">{t.desc}</span>
              </button>
            );
          })}
        </div>
        <p className="mb-0 mt-2.5 text-xs text-mute">この端末の表示だけが変わります（大会データには影響しません）。</p>
      </Card>

      <Card>
        <SectionTitle>基本設定</SectionTitle>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-mute">大会タイトル</label>
          <input type="text" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-mute">コート数（同時進行できる試合数）</label>
          <CountStepper value={courts} min={1} max={16} onChange={setCourts} />
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={saveBasic}>保存</Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>対抗戦（{data.matchups.length}）</SectionTitle>
        <p className="mt-0 text-xs text-mute">
          チーム・対抗戦は写真取り込みで自動作成されます。チームの追加・改名・削除は「チーム・選手」画面から。
        </p>
        {data.matchups.length === 0 ? (
          <p className="text-[13px] text-mute">まだ対抗戦がありません。</p>
        ) : (
          <div className="mb-3 flex flex-col gap-2">
            {data.matchups.map((mu) => (
              <div key={mu.id} className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: teamColor(data, mu.aId) }} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{muLabel(data, mu)}</span>
                <Button size="sm" variant="danger" onClick={() => setDelMu(mu)}>削除</Button>
              </div>
            ))}
          </div>
        )}
        {data.teams.length >= 2 && (
          <>
            <label className="mb-1 block text-xs font-bold text-mute">対抗戦を手動で追加</label>
            <div className="flex items-center gap-2">
              <select className="input" value={muA} onChange={(e) => setMuA(e.target.value)}>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <span className="text-xs font-bold text-mute">vs</span>
              <select className="input" value={muB} onChange={(e) => setMuB(e.target.value)}>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Button variant="ghost" onClick={addMatchup}>追加</Button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>写真取り込み（AI画像認識）</SectionTitle>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-mute">使用するAI</label>
          <select
            className="input"
            value={ai.provider}
            onChange={(e) => {
              const p = e.target.value as Provider;
              setAi((a) => ({ ...a, provider: p, model: DEFAULT_MODELS[p] }));
            }}
          >
            <option value="gemini">Google Gemini（無料枠あり・推奨）</option>
            <option value="claude">Claude（有料・高精度）</option>
            <option value="openai">OpenAI（有料）</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-mute">APIキー（この端末内のみに保存）</label>
          <input
            type="text"
            className="input"
            placeholder="キーを貼り付け"
            value={ai.key}
            onChange={(e) => setAi((a) => ({ ...a, key: e.target.value }))}
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-bold text-mute">モデル名</label>
          <input
            type="text"
            className="input"
            value={ai.model}
            onChange={(e) => setAi((a) => ({ ...a, model: e.target.value }))}
          />
        </div>
        <Banner className="mb-3">{PROVIDER_HELP[ai.provider]}</Banner>
        <div className="flex justify-end">
          <Button variant="primary" onClick={saveAi}>保存</Button>
        </div>
        {data.ai.key && (
          <>
            <hr className="my-4 border-line" />
            <label className="block text-xs font-bold text-mute">他の端末への引き継ぎ</label>
            <p className="mb-2.5 mt-1.5 text-xs leading-relaxed text-mute">
              下のボタンでコピーしたリンクを他の端末（スマホ等）で開くと、APIキーが自動で設定されます。
              <b className="text-warn">キーが含まれるので、運営メンバー以外に送らないでください。</b>
            </p>
            <Button variant="ghost" onClick={copySetupLink}>設定リンクをコピー</Button>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>データ</SectionTitle>
        <div className="flex flex-col items-start gap-2.5">
          <Button
            variant="ghost"
            onClick={() =>
              setConfirmState({
                msg: 'サンプルデータ（あじさい vs たんぽぽ）を読み込みますか？現在の表示中データは置き換わります。',
                ok: () => {
                  loadSample();
                  toast('サンプルデータを読み込みました');
                },
              })
            }
          >
            サンプルデータを読み込んで試す
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setConfirmState({
                msg: '全試合を「未」に戻しますか？スコアも消えます。',
                ok: () => {
                  resetStatus();
                  toast('進行をリセットしました');
                },
              })
            }
          >
            全試合を「未」に戻す（進行リセット）
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              setConfirmState({
                msg: 'すべての大会データ（チーム・対抗戦・試合）を消去します。よろしいですか？（AIのAPIキーは保持されます）',
                danger: true,
                ok: () => {
                  resetAll();
                  toast('初期データに戻しました');
                },
              })
            }
          >
            すべて初期データに戻す
          </Button>
        </div>
      </Card>

      {confirmState && (
        <Confirm
          message={confirmState.msg}
          danger={confirmState.danger}
          onOk={confirmState.ok}
          onClose={() => setConfirmState(null)}
        />
      )}
      {delMu && (
        <Confirm
          message={`「${muLabel(data, delMu)}」を削除しますか？この対抗戦の試合も消えます。`}
          danger
          onOk={() => {
            mutate((d) => {
              d.matchups = d.matchups.filter((x) => x.id !== delMu.id);
              d.matches = d.matches.filter((m) => m.matchupId !== delMu.id);
            });
            toast('削除しました');
          }}
          onClose={() => setDelMu(null)}
        />
      )}
      {linkPrompt && (
        <Prompt
          title="このリンクをコピーしてください"
          initial={linkPrompt}
          onOk={() => {}}
          onClose={() => setLinkPrompt(null)}
        />
      )}
    </div>
  );
}
