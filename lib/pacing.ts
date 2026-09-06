import type { Data, Match } from './types';
import { pById } from './logic';

// この分数未満の休憩で再出場すると「連戦」とみなす
export const BACK_TO_BACK_MIN = 20;
// 実測データが無いときの想定所要時間（分）
export const DEFAULT_MATCH_MIN = 25;
// 明らかに押し忘れた記録を平均から除くための上限（分）
const MAX_PLAUSIBLE_MIN = 180;

const ms = (iso: string | null | undefined) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};

export interface PlayerPace {
  playedCount: number; // 完了した試合数
  remaining: number; // まだ残っている試合数
  live: boolean; // いま試合中
  liveCourt: number | null; // 試合中のコート番号（0始まり）
  lastEndedAt: number | null; // 直近に終えた試合の終了時刻
  restMin: number | null; // 休憩時間（分）。null = まだ一度も出ていない or 記録なし
}

// 選手ごとの出場状況。合宿では「誰が休んでいて誰が連投か」が判断材料になる
export function playerPaces(d: Data, now: number): Map<string, PlayerPace> {
  const map = new Map<string, PlayerPace>();
  const get = (id: string) => {
    let p = map.get(id);
    if (!p) {
      p = { playedCount: 0, remaining: 0, live: false, liveCourt: null, lastEndedAt: null, restMin: null };
      map.set(id, p);
    }
    return p;
  };
  d.players.forEach((p) => get(p.id));
  d.matches.forEach((m) => {
    const ids = (m.sideA || []).concat(m.sideB || []);
    ids.forEach((id) => {
      const p = get(id);
      if (m.status === 'done') {
        p.playedCount++;
        const e = ms(m.endedAt);
        if (e != null && (p.lastEndedAt == null || e > p.lastEndedAt)) p.lastEndedAt = e;
      } else if (m.status === 'live') {
        p.live = true;
        p.liveCourt = m.court ?? null;
      } else {
        p.remaining++;
      }
    });
  });
  map.forEach((p) => {
    p.restMin = p.lastEndedAt == null ? null : Math.max(0, Math.round((now - p.lastEndedAt) / 60000));
  });
  return map;
}

export interface MatchPace {
  waitMin: number | null; // 参加者のうち最も長く待っている人の休憩時間
  waitName: string; // その人の名前
  neverPlayed: boolean; // まだ一度も出ていない参加者がいる
  backToBack: boolean; // 直前に試合を終えたばかりの参加者がいる
  tightMin: number | null; // 参加者のうち最も休憩が短い人の休憩時間
  tightName: string; // その人の名前（連戦の警告に使う）
}

export function matchPace(d: Data, m: Match, paces: Map<string, PlayerPace>): MatchPace {
  const ids = (m.sideA || []).concat(m.sideB || []);
  const nameOf = (id: string) => (pById(d, id) || { name: '?' }).name;
  let waitMin: number | null = null, waitName = '';
  let tightMin: number | null = null, tightName = '';
  let neverPlayed = false;
  ids.forEach((id) => {
    const p = paces.get(id);
    const r = p?.restMin ?? null;
    if (r == null) {
      // 記録が無い＝まだ出ていない。最優先で入れたいので「待ち最長」と同じ扱いにする
      if (!p || p.playedCount === 0) neverPlayed = true;
      return;
    }
    if (waitMin == null || r > waitMin) { waitMin = r; waitName = nameOf(id); }
    if (tightMin == null || r < tightMin) { tightMin = r; tightName = nameOf(id); }
  });
  return {
    waitMin, waitName, neverPlayed,
    backToBack: tightMin != null && tightMin < BACK_TO_BACK_MIN,
    tightMin, tightName,
  };
}

// 対抗戦ごとの消化率。遅れているカードを優先して均す
function matchupProgress(d: Data): Map<string, number> {
  const tot = new Map<string, number>(), don = new Map<string, number>();
  d.matches.forEach((m) => {
    tot.set(m.matchupId, (tot.get(m.matchupId) || 0) + 1);
    if (m.status === 'done') don.set(m.matchupId, (don.get(m.matchupId) || 0) + 1);
  });
  const r = new Map<string, number>();
  tot.forEach((n, id) => r.set(id, n ? (don.get(id) || 0) / n : 1));
  return r;
}

// 「次に入れる試合」の推奨順。組み合わせは変えず、入れる順番だけを並べ替える
export function recommendOrder(d: Data, ready: Match[], paces: Map<string, PlayerPace>): Match[] {
  const prog = matchupProgress(d);
  const muIndex = new Map(d.matchups.map((mu, i) => [mu.id, i]));
  const pace = new Map(ready.map((m) => [m.id, matchPace(d, m, paces)]));
  return [...ready].sort((a, b) => {
    const pa = pace.get(a.id)!, pb = pace.get(b.id)!;
    // 1. 連戦になる試合は後回し
    if (pa.backToBack !== pb.backToBack) return pa.backToBack ? 1 : -1;
    // 2. まだ一度も出ていない人がいる試合を優先
    if (pa.neverPlayed !== pb.neverPlayed) return pa.neverPlayed ? -1 : 1;
    // 3. 長く待っている人がいる試合を優先
    const wa = pa.waitMin ?? -1, wb = pb.waitMin ?? -1;
    if (wa !== wb) return wb - wa;
    // 4. 消化が遅れている対抗戦を優先
    const ga = prog.get(a.matchupId) ?? 1, gb = prog.get(b.matchupId) ?? 1;
    if (ga !== gb) return ga - gb;
    // 5. 最後は対戦表どおりの順
    return ((muIndex.get(a.matchupId) ?? 0) - (muIndex.get(b.matchupId) ?? 0)) || (a.order - b.order);
  });
}

export interface Progress {
  total: number;
  done: number;
  live: number;
  pending: number;
  remaining: number; // live + pending
  avgMin: number; // 1試合の所要時間
  measured: boolean; // 実測値かどうか（false なら既定値）
  sampleCount: number; // 平均の元になった試合数
  finishAt: number | null; // 終了見込み時刻
}

// 実測の所要時間は中央値を使う（終了ボタンの押し忘れによる極端な値に引きずられないため）
function medianDuration(matches: Match[]): { avg: number; n: number } {
  const xs: number[] = [];
  matches.forEach((m) => {
    const s = ms(m.startedAt), e = ms(m.endedAt);
    if (s == null || e == null || e <= s) return;
    const min = (e - s) / 60000;
    if (min > 0 && min <= MAX_PLAUSIBLE_MIN) xs.push(min);
  });
  if (!xs.length) return { avg: DEFAULT_MATCH_MIN, n: 0 };
  xs.sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  const med = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  return { avg: Math.max(1, Math.round(med)), n: xs.length };
}

// 残り試合数と終了見込み。合宿では「今日中に終わるのか」が常に問題になる
export function progressOf(scope: Match[], courts: number, now: number): Progress {
  const done = scope.filter((m) => m.status === 'done');
  const live = scope.filter((m) => m.status === 'live');
  const pending = scope.filter((m) => m.status === 'pending');
  const { avg, n } = medianDuration(done);
  const c = Math.max(1, courts);
  // 進行中の試合は経過時間を引いた残りだけを見込む（最低3分）
  const liveRemain = live.reduce((s, m) => {
    const st = ms(m.startedAt);
    const elapsed = st == null ? avg / 2 : (now - st) / 60000;
    return s + Math.max(3, avg - elapsed);
  }, 0);
  const totalMin = (pending.length * avg + liveRemain) / c;
  return {
    total: scope.length,
    done: done.length,
    live: live.length,
    pending: pending.length,
    remaining: live.length + pending.length,
    avgMin: avg,
    measured: n > 0,
    sampleCount: n,
    finishAt: live.length + pending.length === 0 ? null : now + totalMin * 60000,
  };
}

export function fmtClock(t: number): string {
  const d = new Date(t);
  return `${d.getHours()}:${('0' + d.getMinutes()).slice(-2)}`;
}

export function fmtSpan(min: number): string {
  const m = Math.max(0, Math.round(min));
  return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`;
}
