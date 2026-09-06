import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { BuiltMatchup, Data, MatchGender, SavePayload, SaveSlot, ThemeId } from './types';
import { defaultData, muId, muById, normalizePayload, sampleData, syncMatchups, uid } from './logic';
import { DEFAULT_THEME } from './themes';
import {
  loadSyncConfig, pushMutation, saveSyncConfig, startSync, stopSync,
  type SyncConfig, type SyncStatus,
} from './sync';

export const LS_KEY = 'tennis_taikousen_v3';
export const LS_SAVES = 'tennis_taikousen_saves_v3';

// 旧単一HTML版（v2/v1）からのデータ引き継ぎ付きストレージ
const migratingStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(name);
    if (raw) return raw;
    for (const old of ['tennis_taikousen_v2', 'tennis_taikousen_v1']) {
      try {
        const s = localStorage.getItem(old);
        if (s) {
          const d = JSON.parse(s);
          if (d && Array.isArray(d.teams)) {
            const base = defaultData();
            return JSON.stringify({ state: { data: { ...base, ...d, ai: d.ai || base.ai } }, version: 0 });
          }
        }
      } catch { /* ignore */ }
    }
    return null;
  },
  setItem: (name, value) => {
    if (typeof window !== 'undefined') localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== 'undefined') localStorage.removeItem(name);
  },
};

interface StoreState {
  data: Data;
  hydrated: boolean;
  boardMu: string; // 進行ボードで選択中の対抗戦（'__all' = 全対抗戦）
  theme: ThemeId;
  syncStatus: SyncStatus;
  syncRoom: string;
  syncMsg: string;
  setTheme: (t: ThemeId) => void;
  setBoardMu: (id: string) => void;
  mutate: (fn: (d: Data) => void) => void;
  applySnapshot: (p: SavePayload) => void;
  applyExtraction: (built: BuiltMatchup[]) => string | null;
  resetAll: () => void;
  resetStatus: () => void;
  loadSample: () => void;
  enableSync: (c: SyncConfig) => Promise<void>;
  disableSync: () => void;
  initSync: () => void;
}

// 全データを置き換える操作も「変更関数」として表現する。こうしておくと
// 同期時にサーバの最新状態の上へそのまま載せ直せる。
function replaceAll(d: Data, p: SavePayload): void {
  d.teams = p.teams;
  d.players = p.players;
  d.matchups = p.matchups;
  d.matches = p.matches;
  d.courtCount = p.courtCount;
  d.title = p.title;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      data: defaultData(),
      hydrated: false,
      boardMu: '__all',
      theme: DEFAULT_THEME,
      syncStatus: 'off',
      syncRoom: '',
      syncMsg: '',
      setTheme: (t) => set({ theme: t }),
      setBoardMu: (id) => set({ boardMu: id }),

      // ローカル優先: 手元に即反映し、同期中なら同じ操作を裏で送る
      mutate: (fn) => {
        set((s) => {
          const d = structuredClone(s.data);
          fn(d);
          return { data: d };
        });
        pushMutation(fn);
      },

      // 保存データ読込。ai（キー含む）は保持する
      applySnapshot: (p) => {
        const snap = structuredClone(p);
        get().mutate((d) => replaceAll(d, structuredClone(snap)));
        set({ boardMu: '__all' });
      },

      // 写真取り込み結果の反映（同名チームのid共有・左右入替の整合を含む）
      applyExtraction: (built) => {
        // 同期でやり直されても同じ結果になるよう、idは先に決めておく
        const pool = Array.from({ length: built.reduce((n, b) => n + b.matches.length * 4 + 4, 8) }, () => uid());
        let lastMid: string | null = null;

        const apply = (d: Data) => {
          let pi = 0;
          const nid = () => pool[pi++] ?? uid();
          const reg: Record<string, string> = {};
          const findTeamByName = (name: string) => {
            const n = (name || '').trim();
            return d.teams.find((t) => t.name.trim() === n)
              || d.teams.find((t) => t.name.trim().toLowerCase() === n.toLowerCase());
          };
          const getTeam = (name: string) => {
            let t = findTeamByName(name);
            if (!t) {
              t = { id: nid(), name: (name || 'チーム').trim() };
              d.teams.push(t);
            }
            return t;
          };
          const getP = (teamId: string, name: string, gender: MatchGender) => {
            const key = teamId + '|' + name;
            if (reg[key]) return reg[key];
            let p = d.players.find((x) => x.teamId === teamId && x.name === name);
            if (!p) {
              p = { id: nid(), teamId, name, gender };
              d.players.push(p);
            } else if (p.gender === 'X' && gender !== 'X') p.gender = gender;
            reg[key] = p.id;
            return p.id;
          };
          built.forEach((b) => {
            const ta = getTeam(b.aName), tb = getTeam(b.bName);
            const mid = muId(ta.id, tb.id);
            if (!muById(d, mid)) d.matchups.push({ id: mid, aId: ta.id, bId: tb.id });
            const mu = muById(d, mid)!;
            const aIsFirst = mu.aId === ta.id;
            d.matches = d.matches.filter((m) => m.matchupId !== mid); // この対抗戦は入れ替え
            b.matches.forEach((m, i) => {
              const taIds = m.aNames.map((n) => getP(ta.id, n, m.gender));
              const tbIds = m.bNames.map((n) => getP(tb.id, n, m.gender));
              d.matches.push({
                id: nid(), matchupId: mid, cat: m.cat, no: m.no, gender: m.gender, order: i,
                sideA: aIsFirst ? taIds : tbIds, sideB: aIsFirst ? tbIds : taIds,
                court: null, status: 'pending', scoreA: null, scoreB: null,
                startedAt: null, endedAt: null,
              });
            });
            lastMid = mid;
          });
          syncMatchups(d);
        };

        get().mutate(apply);
        return lastMid;
      },

      // リセット時も ai.key は保持
      resetAll: () => {
        const base = defaultData();
        get().mutate((d) => replaceAll(d, {
          teams: [], players: [], matchups: [], matches: [],
          courtCount: base.courtCount, title: base.title,
        }));
        set({ boardMu: '__all' });
      },

      resetStatus: () => {
        get().mutate((d) => {
          d.matches.forEach((m) => {
            m.status = 'pending';
            m.court = null;
            m.scoreA = null;
            m.scoreB = null;
            m.tbA = null;
            m.tbB = null;
            m.startedAt = null;
            m.endedAt = null;
          });
        });
      },

      loadSample: () => {
        const s = sampleData();
        get().mutate((d) => replaceAll(d, structuredClone(s)));
        set({ boardMu: '__all' });
      },

      /* ---------------- 端末間同期 ---------------- */
      enableSync: async (c) => {
        saveSyncConfig(c);
        set({ syncRoom: c.room, syncStatus: 'connecting', syncMsg: '' });
        await startSync(c, {
          getLocal: () => get().data,
          adopt: (p) =>
            set((s) => ({ data: { ...defaultData(), ...normalizePayload(p), ai: s.data.ai } })),
          onStatus: (st, msg) => set({ syncStatus: st, syncMsg: msg || '' }),
        });
      },

      disableSync: () => {
        stopSync();
        saveSyncConfig(null);
        set({ syncStatus: 'off', syncRoom: '', syncMsg: '' });
      },

      // 起動時、保存済みの設定があれば自動で接続する
      initSync: () => {
        const c = loadSyncConfig();
        if (c) void get().enableSync(c);
      },
    }),
    {
      name: LS_KEY,
      storage: createJSONStorage(() => migratingStorage),
      partialize: (s) => ({ data: s.data, theme: s.theme }),
      // 同期を経由して配列が壊れた状態で保存されている場合があるので、読み込み時に必ず直す
      merge: (persisted, current) => {
        const p = (persisted || {}) as { data?: Partial<Data>; theme?: ThemeId };
        if (!p.data) return { ...current, ...(p.theme ? { theme: p.theme } : {}) };
        const base = defaultData();
        return {
          ...current,
          ...(p.theme ? { theme: p.theme } : {}),
          data: { ...base, ...normalizePayload(p.data), ai: { ...base.ai, ...(p.data.ai || {}) } },
        };
      },
      skipHydration: true, // SSG プリレンダとの hydration mismatch 回避。AppShell で手動 rehydrate
    },
  ),
);

/* ---------------- 保存スロット（名前付きスナップショット） ---------------- */
export function loadSaves(): SaveSlot[] {
  try {
    return JSON.parse(localStorage.getItem(LS_SAVES) || '[]') || [];
  } catch {
    return [];
  }
}

export function writeSaves(arr: SaveSlot[]): void {
  localStorage.setItem(LS_SAVES, JSON.stringify(arr));
}
