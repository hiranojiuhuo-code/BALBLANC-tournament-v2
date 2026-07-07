# BALBLANC 対抗戦 進行管理 v2

テニス対抗戦（2チームの団体戦）の進行管理Webアプリ。単一HTML版（BALBLANC-tournament）を Next.js 15 + TypeScript + Tailwind CSS 4 で完全リビルドしたもの。機能は旧版と完全パリティ。

## 主な機能

- **進行ボード**: コートカード＋「今すぐ組める試合」キュー。live中の選手集合と照合して出場者の被り（ダブルブッキング）を検出。試合タップ→コートタップの2タップで開始、大きな±ステッパーでスコア入力
- **試合一覧**: 対抗戦・種目・状態でフィルタ、試合の追加・編集・削除・並べ替え
- **順位表**: 対抗戦ごとの取得試合数スコアとチーム順位表
- **チーム・選手管理 / 個人成績**: 男女別ランキング、チーム・種目での絞り込み
- **写真取り込み**: 手書き対戦表をAI（Gemini / Claude / OpenAI）で解析して自動登録。取り込み履歴は IndexedDB にアーカイブ
- **保存データ**: 名前付きスナップショット、JSONファイル書出/読込（旧版と相互互換）
- **簡易認証ゲート**: 運営パスコード（SHA-256、旧版と同一）

## 技術構成

- Next.js 15 (App Router) / TypeScript / Tailwind CSS 4 / zustand (persist)
- 完全クライアントサイド（`output: 'export'` による静的書き出し、バックエンドなし）
- データ保存: localStorage（`tennis_taikousen_v3` / `tennis_taikousen_saves_v3`、旧 v2/v1 キーからの自動引き継ぎあり）＋ IndexedDB（`tennis_archive` / `imports`）

## 開発

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # 静的書き出し（out/）
```

## デプロイ

main へ push すると GitHub Actions（`.github/workflows/deploy.yml`）が GitHub Pages へ自動デプロイします。`basePath` は `/BALBLANC-tournament-v2` を想定。リポジトリの Settings → Pages で Source を「GitHub Actions」にしてください。
