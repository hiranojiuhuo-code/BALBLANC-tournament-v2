import type { ThemeId } from './types';

// 着せ替えテーマ。実体は globals.css の html[data-theme] で定義されたCSS変数群
export const THEMES: { id: ThemeId; name: string; desc: string; swatch: [string, string, string] }[] = [
  { id: 'wimbledon', name: 'ウィンブルドン', desc: '天然芝 × ホワイト', swatch: ['#f4f8f2', '#1f8a3d', '#6741d9'] },
  { id: 'rg', name: '全仏オープン', desc: '赤土クレー × サンド', swatch: ['#f7efe4', '#c2440e', '#0f7b63'] },
  { id: 'ao', name: '全豪オープン', desc: 'ハードコート × ネイビー', swatch: ['#06162e', '#22b8f0', '#4dabf7'] },
];

export const DEFAULT_THEME: ThemeId = 'wimbledon';

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
}
