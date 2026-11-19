'use client';

import React, { useEffect, useState } from 'react';
import { Banner, Card, SectionTitle } from './Card';
import { Button } from './Button';
import { toast } from './Toast';

// Chrome系が出す「インストールできます」の合図。標準の型定義には無いので最小限だけ書く
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
declare global {
  interface Window { __bip?: InstallPromptEvent | null }
}

/*
 * ホーム画面に追加してアプリとして使うための案内。
 * Android/PCのChromeはボタンから入れられるが、iPhoneは仕組み上
 * 「共有 → ホーム画面に追加」を自分で押してもらうしかないので、手順を出す。
 */
export function InstallCard() {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true);
    // iPadは「Macintosh」と名乗るので、タッチ対応かどうかで見分ける
    setIos(/iphone|ipad|ipod/i.test(nav.userAgent) || (/macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1));
    const sync = () => setCanPrompt(!!window.__bip);
    sync();
    setReady(true);
    window.addEventListener('bip-ready', sync);
    return () => window.removeEventListener('bip-ready', sync);
  }, []);

  async function install() {
    const ev = window.__bip;
    if (!ev) return;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    window.__bip = null;
    setCanPrompt(false);
    if (outcome === 'accepted') toast('ホーム画面に追加しました');
  }

  if (!ready) return null;

  return (
    <Card>
      <SectionTitle>アプリとして使う</SectionTitle>
      {standalone ? (
        <Banner>
          アプリとして起動しています。一度開いた画面は、電波が弱い場所でもそのまま開けます。
        </Banner>
      ) : (
        <>
          <p className="mt-0 text-xs leading-relaxed text-mute">
            ホーム画面に追加すると、アイコンから全画面で起動でき、電波が弱い場所でも開けるようになります。
            データはこれまでどおりこの端末に保存されます。
          </p>
          {canPrompt ? (
            <Button variant="primary" onClick={install}>ホーム画面に追加する</Button>
          ) : ios ? (
            <ol className="mb-0 ml-4 list-decimal space-y-1.5 text-[13px] leading-relaxed">
              <li><b>Safari</b> でこのページを開く（LINEなどのアプリ内ブラウザでは追加できません）</li>
              <li>画面下の<b>共有ボタン</b>（四角から矢印が出ているマーク）を押す</li>
              <li>「<b>ホーム画面に追加</b>」を選んで「追加」を押す</li>
            </ol>
          ) : (
            <ol className="mb-0 ml-4 list-decimal space-y-1.5 text-[13px] leading-relaxed">
              <li><b>Chrome</b> でこのページを開く</li>
              <li>右上のメニュー（︙）を開く</li>
              <li>「<b>アプリをインストール</b>」または「<b>ホーム画面に追加</b>」を選ぶ</li>
            </ol>
          )}
        </>
      )}
    </Card>
  );
}
