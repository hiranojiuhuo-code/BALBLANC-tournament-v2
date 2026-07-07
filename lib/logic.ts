import type {
  Cat, Data, Match, Matchup, Player, PlayerRecordResult, SavePayload, StandingRow, Team,
} from './types';

export const CATS: Record<Cat, string> = { S: 'シングルス', D: 'ダブルス', M: 'ミックス' };

export const PALETTE = ['#2f6df6', '#e8590c', '#2fa84f', '#7048e8', '#c2255c', '#0c8599', '#495057', '#d6336c'];

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function muId(a: string, b: string): string {
  return a < b ? a + '__' + b : b + '__' + a;
}

export function defaultData(): Data {
  // 初期は空。チーム・対抗戦・試合はすべて写真取り込み（または手動）から作る。
  return {
    teams: [], players: [], matchups: [], matches: [], courtCount: 4, title: '大会',
    ai: { provider: 'gemini', key: '', model: 'gemini-2.5-flash' },
  };
}

export function sampleData(): Data {
  const teams: Team[] = [{ id: 't1', name: 'あじさい' }, { id: 't2', name: 'たんぽぽ' }];
  const players: Player[] = [];
  const reg: Record<string, string> = {};
  function P(teamId: string, name: string, gender: 'M' | 'F'): string {
    const key = teamId + '|' + name;
    if (reg[key]) return reg[key];
    const id = uid();
    players.push({ id, teamId, name, gender });
    reg[key] = id;
    return id;
  }
  const muAB = muId('t1', 't2');
  const matchups: Matchup[] = [{ id: muAB, aId: 't1', bId: 't2' }];
  const matches: Match[] = [];
  let order = 0;
  function M(cat: Cat, no: number, gender: 'M' | 'F' | 'X', aN: string[], bN: string[]) {
    const g = gender === 'X' ? 'M' : gender;
    matches.push({
      id: uid(), matchupId: muAB, cat, no, gender, order: order++,
      sideA: aN.map((n) => P('t1', n, gender === 'X' ? guessG(n) : g)),
      sideB: bN.map((n) => P('t2', n, gender === 'X' ? guessG(n) : g)),
      court: null, status: 'pending', scoreA: null, scoreB: null,
    });
  }
  // ミックスは既存登録（reg）を再利用するため性別推定は実質不要だが、未登録時のフォールバック
  const females = new Set(['たまお', 'もえ', 'こはる', 'まいまい', 'はるか', 'ことね', 'あやか', 'ゆきの', 'みゆ', 'こころ']);
  function guessG(n: string): 'M' | 'F' { return females.has(n) ? 'F' : 'M'; }

  // サンプル: あじさい vs たんぽぽ（写真からの推定。要修正）
  M('S', 1, 'M', ['ゆうき'], ['なぐ']); M('S', 2, 'M', ['りき'], ['けんた']); M('S', 3, 'M', ['こうた'], ['いの']);
  M('D', 1, 'M', ['りひと', 'ゆうき'], ['まこと', 'そうま']); M('D', 2, 'M', ['りひと', 'かぎ'], ['けんた', 'まこと']);
  M('D', 3, 'M', ['りひと', 'りき'], ['いの', 'まこと']); M('D', 4, 'M', ['ゆうき', 'りひと'], ['そうま', 'けんた']);
  M('D', 5, 'M', ['ゆうき', 'りき'], ['いの', 'なぐ']); M('D', 6, 'M', ['ゆうき', 'こうた'], ['けんた', 'なぐ']);
  M('D', 7, 'M', ['かぎ', 'りき'], ['いの', 'けんた']); M('D', 8, 'M', ['こうた', 'りき'], ['いの', 'こういちろう']);
  M('D', 9, 'M', ['こうた', 'りき'], ['いの', 'こういちろう']);
  M('S', 1, 'F', ['たまお'], ['あやか']); M('S', 2, 'F', ['もえ'], ['ゆきの']); M('S', 3, 'F', ['こはる'], ['みゆ']);
  M('D', 1, 'F', ['たまお', 'もえ'], ['あやか', 'ゆきの']); M('D', 2, 'F', ['もえ', 'まいまい'], ['ゆきの', 'あやか']);
  M('D', 3, 'F', ['まいまい', 'はるか'], ['こころ', 'あやか']); M('D', 4, 'F', ['まいまい', 'もえ'], ['ゆきの', 'こころ']);
  M('D', 5, 'F', ['たまお', 'ことね'], ['あやか', 'みゆ']); M('D', 6, 'F', ['もえ', 'こはる'], ['ゆきの', 'はるか']);
  M('D', 7, 'F', ['まいまい', 'こはる'], ['ゆきの', 'みゆ']); M('D', 8, 'F', ['まいまい', 'ことね'], ['こころ', 'はるか']);
  M('D', 9, 'F', ['こはる', 'ことね'], ['こころ', 'みゆ']);
  M('M', 1, 'X', ['ゆうき', 'まいまい'], ['まこと', 'あやか']); M('M', 2, 'X', ['かぎ', 'もえ'], ['なぐ', 'こころ']);
  M('M', 3, 'X', ['こうた', 'ことね'], ['けんた', 'みゆ']);

  return {
    teams, players, matchups, matches, courtCount: 4, title: 'リーグ戦',
    ai: { provider: 'gemini', key: '', model: 'gemini-2.5-flash' },
  };
}

/* ---------------- 参照ヘルパー ---------------- */
export const pById = (d: Data, id: string) => d.players.find((p) => p.id === id);
export const tById = (d: Data, id: string) => d.teams.find((t) => t.id === id);
export const tName = (d: Data, id: string) => (tById(d, id) || { name: '?' }).name;
export const muById = (d: Data, id: string) => d.matchups.find((m) => m.id === id);

export function teamColor(d: Data, id: string): string {
  const i = d.teams.findIndex((t) => t.id === id);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
}

export function names(d: Data, ids: string[]): string {
  return ids.map((id) => (pById(d, id) || { name: '?' }).name).join('・');
}

export function muLabel(d: Data, mu: Matchup | undefined): string {
  return mu ? tName(d, mu.aId) + ' vs ' + tName(d, mu.bId) : '';
}

export function matchLabel(m: Pick<Match, 'cat' | 'no' | 'gender'>): string {
  const g = m.gender === 'M' ? '男子' : m.gender === 'F' ? '女子' : '混合';
  return m.cat === 'M' ? 'ミックス' + m.no : g + (m.cat === 'S' ? 'S' : 'D') + m.no;
}

export function matchesOf(d: Data, id: string): Match[] {
  return d.matches.filter((m) => m.matchupId === id);
}

/* ---------------- 被り検出（核心ロジック） ---------------- */
export function busyPlayerIds(d: Data): Set<string> {
  const s = new Set<string>();
  d.matches.filter((m) => m.status === 'live').forEach((m) => m.sideA.concat(m.sideB).forEach((id) => s.add(id)));
  return s;
}

export function conflictNames(d: Data, m: Match, busy: Set<string>): string[] {
  return m.sideA.concat(m.sideB).filter((id) => busy.has(id))
    .map((id) => (pById(d, id) || { name: '' }).name).filter(Boolean);
}

export function freeCourts(d: Data): number[] {
  const used = new Set(d.matches.filter((m) => m.status === 'live' && m.court != null).map((m) => m.court));
  const a: number[] = [];
  for (let i = 0; i < d.courtCount; i++) if (!used.has(i)) a.push(i);
  return a;
}

export function liveOnCourt(d: Data, i: number): Match | undefined {
  return d.matches.find((m) => m.status === 'live' && m.court === i);
}

/* ---------------- 対抗戦の整合 ---------------- */
export function syncMatchups(d: Data): void {
  // 無効な対抗戦の掃除のみ行い、総当たり生成はしない
  const ids = d.teams.map((t) => t.id);
  d.matchups = d.matchups.filter((mu) => ids.includes(mu.aId) && ids.includes(mu.bId));
  const valid = new Set(d.matchups.map((m) => m.id));
  d.matches = d.matches.filter((m) => valid.has(m.matchupId));
  d.matchups.sort((x, y) => (ids.indexOf(x.aId) - ids.indexOf(y.aId)) || (ids.indexOf(x.bId) - ids.indexOf(y.bId)));
}

export function ensureMatchup(d: Data, aId: string, bId: string): string {
  const id = muId(aId, bId);
  if (!muById(d, id)) d.matchups.push({ id, aId, bId });
  return id;
}

/* ---------------- 集計 ---------------- */
export function matchupScore(d: Data, id: string): { a: number; b: number } {
  let a = 0, b = 0;
  matchesOf(d, id).filter((m) => m.status === 'done' && m.scoreA != null).forEach((m) => {
    if ((m.scoreA as number) > (m.scoreB as number)) a++;
    else if ((m.scoreB as number) > (m.scoreA as number)) b++;
  });
  return { a, b };
}

export function standings(d: Data): StandingRow[] {
  const map: Record<string, StandingRow> = {};
  d.teams.forEach((t) => (map[t.id] = { id: t.id, name: t.name, muW: 0, muL: 0, muD: 0, mw: 0, ml: 0 }));
  d.matchups.forEach((mu) => {
    const s = matchupScore(d, mu.id);
    if (s.a === 0 && s.b === 0) return; // 未実施はスキップ
    map[mu.aId].mw += s.a; map[mu.aId].ml += s.b;
    map[mu.bId].mw += s.b; map[mu.bId].ml += s.a;
    if (s.a > s.b) { map[mu.aId].muW++; map[mu.bId].muL++; }
    else if (s.b > s.a) { map[mu.bId].muW++; map[mu.aId].muL++; }
    else { map[mu.aId].muD++; map[mu.bId].muD++; }
  });
  return Object.values(map).sort((x, y) => y.muW - x.muW || (y.mw - y.ml) - (x.mw - x.ml) || y.mw - x.mw);
}

// 個人成績：done かつスコア入力済みの試合から集計
export function playerRecord(d: Data, pid: string, catFilter: Cat | 'all'): PlayerRecordResult {
  let w = 0, l = 0, gf = 0, ga = 0;
  d.matches.forEach((m) => {
    if (m.status !== 'done' || m.scoreA == null) return;
    if (catFilter && catFilter !== 'all' && m.cat !== catFilter) return;
    const inA = m.sideA.includes(pid), inB = m.sideB.includes(pid);
    if (!inA && !inB) return;
    const my = inA ? (m.scoreA as number) : (m.scoreB as number);
    const op = inA ? (m.scoreB as number) : (m.scoreA as number);
    gf += my; ga += op;
    if (my > op) w++; else if (op > my) l++;
  });
  return { w, l, gf, ga, played: w + l };
}

/* ---------------- スナップショット ---------------- */
export function snapshot(d: Data): SavePayload {
  return JSON.parse(JSON.stringify({
    teams: d.teams, players: d.players, matchups: d.matchups, matches: d.matches,
    courtCount: d.courtCount, title: d.title,
  }));
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${('0' + d.getHours()).slice(-2)}:${('0' + d.getMinutes()).slice(-2)}`;
}
