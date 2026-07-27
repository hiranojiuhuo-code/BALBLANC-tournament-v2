import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { BuiltMatchup, Data, MatchGender, SavePayload, SaveSlot, ThemeId } from './types';
import { defaultData, muId, muById, sampleData, syncMatchups, uid } from './logic';
import { DEFAULT_THEME } from './themes';

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
  setTheme: (t: ThemeId) => void;
  setBoardMu: (id: string) => void;
  mutate: (fn: (d: Data) => void) => void;
  applySnapshot: (p: SavePayload) => void;
  applyExtraction: (built: BuiltMatchup[]) => string | null;
  resetAll: () => void;
  resetStatus: () => void;
  loadSample: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      data: defaultData(),
      hydrated: false,
      boardMu: '__all',
      theme: DEFAULT_THEME,
      setTheme: (t) => set({ theme: t }),
      setBoardMu: (id) => set({ boardMu: id }),

      mutate: (fn) =>
        set((s) => {
          const d = structuredClone(s.data);
          fn(d);
          return { data: d };
        }),

      // 保存データ読込。ai（キー含む）は保持する
      applySnapshot: (p) =>
        set((s) => {
          const ai = s.data.ai;
          const d: Data = { ...defaultData(), ...structuredClone(p), ai };
          return { data: d, boardMu: '__all' };
        }),

      // 写真取り込み結果の反映（同名チームのid共有・左右入替の整合を含む。参照実装の applyExtraction を移植）
      applyExtraction: (built) => {
        let lastMid: string | null = null;
        set((s) => {
          const d = structuredClone(s.data);
          const reg: Record<string, string> = {};
          const findTeamByName = (name: string) => {
            const n = (name || '').trim();
            return d.teams.find((t) => t.name.trim() === n)
              || d.teams.find((t) => t.name.trim().toLowerCase() === n.toLowerCase());
          };
          const getTeam = (name: string) => {
            let t = findTeamByName(name);
            if (!t) {
              t = { id: uid(), name: (name || 'チーム').trim() };
              d.teams.push(t);
            }
            return t;
          };
          const getP = (teamId: string, name: string, gender: MatchGender) => {
            const key = teamId + '|' + name;
            if (reg[key]) return reg[key];
            let p = d.players.find((x) => x.teamId === teamId && x.name === name);
            if (!p) {
              p = { id: uid(), teamId, name, gender };
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
                id: uid(), matchupId: mid, cat: m.cat, no: m.no, gender: m.gender, order: i,
                sideA: aIsFirst ? taIds : tbIds, sideB: aIsFirst ? tbIds : taIds,
                court: null, status: 'pending', scoreA: null, scoreB: null,
              });
            });
            lastMid = mid;
          });
          syncMatchups(d);
          return { data: d };
        });
        return lastMid;
      },

      // リセット時も ai.key は保持
      resetAll: () => set((s) => ({ data: { ...defaultData(), ai: s.data.ai }, boardMu: '__all' })),

      resetStatus: () =>
        set((s) => {
          const d = structuredClone(s.data);
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
          return { data: d };
        }),

      loadSample: () => set((s) => ({ data: { ...sampleData(), ai: s.data.ai }, boardMu: '__all' })),
    }),
    {
      name: LS_KEY,
      storage: createJSONStorage(() => migratingStorage),
      partialize: (s) => ({ data: s.data, theme: s.theme }),
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
