export type Cat = 'S' | 'D' | 'M';
export type MatchGender = 'M' | 'F' | 'X';
// X は写真取り込み時（ミックス戦のみ出場）の暫定値。性別入りの試合を取り込むと確定する
export type PlayerGender = 'M' | 'F' | 'X';
export type Status = 'pending' | 'live' | 'done';
export type Provider = 'gemini' | 'claude' | 'openai';
export type ThemeId = 'wimbledon' | 'rg' | 'ao';

export interface Team {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  gender: PlayerGender;
}

export interface Matchup {
  id: string; // muId(a,b) = a<b ? `${a}__${b}` : `${b}__${a}`
  aId: string;
  bId: string;
}

export interface Match {
  id: string;
  matchupId: string;
  cat: Cat;
  no: number;
  gender: MatchGender;
  order: number;
  sideA: string[];
  sideB: string[];
  court: number | null;
  status: Status;
  scoreA: number | null; // 獲得ゲーム数
  scoreB: number | null;
  tbA?: number | null; // タイブレークの獲得ポイント（7-6/6-7時のみ。任意）
  tbB?: number | null;
  startedAt?: string | null; // コートに入れた時刻（ISO）。待ち時間・所要時間の算出に使う
  endedAt?: string | null; // 結果を確定した時刻（ISO）
  queuedAt?: number | null; // 「次の試合」待機列に入れた時刻。並び順にも使う
}

export interface AiConfig {
  provider: Provider;
  key: string;
  model: string;
}

export interface Data {
  teams: Team[];
  players: Player[];
  matchups: Matchup[];
  matches: Match[];
  courtCount: number;
  title: string;
  ai: AiConfig;
}

export interface SavePayload {
  teams: Team[];
  players: Player[];
  matchups: Matchup[];
  matches: Match[];
  courtCount: number;
  title: string;
}

export interface SaveSlot {
  id: string;
  name: string;
  savedAt: string;
  payload: SavePayload;
}

export interface BuiltMatch {
  cat: Cat;
  no: number;
  gender: MatchGender;
  aNames: string[];
  bNames: string[];
}

export interface BuiltMatchup {
  aName: string;
  bName: string;
  matches: BuiltMatch[];
}

export interface ArchiveEntry {
  id: string;
  savedAt: string;
  images: string[]; // dataURL
  built: BuiltMatchup[];
}

export interface StandingRow {
  id: string;
  name: string;
  muW: number;
  muL: number;
  muD: number;
  mw: number;
  ml: number;
  mixW: number; // うちミックスでの勝ち数
  mixL: number;
}

export interface PlayerRecordResult {
  w: number;
  l: number;
  gf: number;
  ga: number;
  played: number;
}
