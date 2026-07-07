export type Cat = 'S' | 'D' | 'M';
export type MatchGender = 'M' | 'F' | 'X';
// X は写真取り込み時（ミックス戦のみ出場）の暫定値。性別入りの試合を取り込むと確定する
export type PlayerGender = 'M' | 'F' | 'X';
export type Status = 'pending' | 'live' | 'done';
export type Provider = 'gemini' | 'claude' | 'openai';

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
  scoreA: number | null;
  scoreB: number | null;
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
}

export interface PlayerRecordResult {
  w: number;
  l: number;
  gf: number;
  ga: number;
  played: number;
}
