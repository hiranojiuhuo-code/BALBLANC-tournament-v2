import type { ThemeId } from './types';

// 着せ替えテーマ。実体は globals.css の html[data-theme] で定義されたCSS変数群
export const THEMES: { id: ThemeId; name: string; desc: string; swatch: [string, string, string] }[] = [
  { id: 'wimbledon', name: 'ウィンブルドン', desc: '天然芝 × ホワイト', swatch: ['#f1f7ee', '#0e8c3a', '#6d28d9'] },
  { id: 'rg', name: '全仏オープン', desc: '灼熱の赤土クレー', swatch: ['#f0ddc3', '#b5310a', '#0a7a5c'] },
  { id: 'ao', name: '全豪オープン', desc: 'ハードコート × ネイビー', swatch: ['#06162e', '#22b8f0', '#4dabf7'] },
];

export const DEFAULT_THEME: ThemeId = 'wimbledon';

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
}
