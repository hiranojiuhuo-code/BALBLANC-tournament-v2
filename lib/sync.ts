'use client';

import type { Data, SavePayload } from './types';
import { snapshot } from './logic';

/*
 * 端末間同期。Firebase Realtime Database の REST + SSE を直接叩く（SDK不要）。
 *
 * - 同期するのは snapshot() の中身だけ。AIのAPIキーは端末内に留めて送らない。
 * - ローカル優先: 変更は即座に手元へ反映し、送信は裏で行う（電波が悪くても操作できる）。
 * - 競合はETagの if-match で検出し、最新を取り直してから同じ操作をやり直す。
 *   これにより「2人が別々のコートに試合を入れた」ような操作が消えない。
 */

export type SyncStatus = 'off' | 'connecting' | 'online' | 'offline' | 'error';
export interface SyncConfig { dbUrl: string; room: string }

const LS_SYNC = 'tennis_sync_v1';
const FLUSH_DELAY = 250;
const RETRY_DELAY = 4000;

export function loadSyncConfig(): SyncConfig | null {
  try {
    const s = localStorage.getItem(LS_SYNC);
    const c = s ? JSON.parse(s) : null;
    return c && c.dbUrl && c.room ? c : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(c: SyncConfig | null): void {
  if (c) localStorage.setItem(LS_SYNC, JSON.stringify(c));
  else localStorage.removeItem(LS_SYNC);
}

// 紛らわしい文字（0/o/1/l）を除いた32文字から生成。URLを知られない限り事実上推測できない長さにする
export function newRoomCode(): string {
  const cs = 'abcdefghijkmnpqrstuvwxyz23456789';
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => cs[b % cs.length]).join('');
}

export function normalizeDbUrl(s: string): string {
  const t = s.trim().replace(/\/+$/, '');
  if (!t) return '';
  return /^https?:\/\//.test(t) ? t : 'https://' + t;
}

function roomUrl(c: SyncConfig): string {
  return `${c.dbUrl}/rooms/${encodeURIComponent(c.room)}.json`;
}

interface RoomDoc { rev: number; updatedAt: number; by: string; payload: SavePayload }

interface Hooks {
  getLocal: () => Data;
  adopt: (p: SavePayload) => void;
  onStatus: (s: SyncStatus, msg?: string) => void;
}

/* ---------------- モジュール内の状態 ---------------- */
let cfg: SyncConfig | null = null;
let hooks: Hooks | null = null;
let es: EventSource | null = null;
let pending: ((d: Data) => void)[] = [];
let flushing = false;
let localRev = 0;
let etagSupported = true; // CORSでETagが読めない環境では後勝ちにフォールバック
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const deviceId = Math.random().toString(36).slice(2, 10);

function setStatus(s: SyncStatus, msg?: string) {
  hooks?.onStatus(s, msg);
}

async function getDoc(): Promise<{ etag: string; doc: RoomDoc | null }> {
  const res = await fetch(roomUrl(cfg!), {
    headers: { 'X-Firebase-ETag': 'true' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const etag = res.headers.get('ETag') || '';
  if (!etag) etagSupported = false;
  const doc = (await res.json()) as RoomDoc | null;
  return { etag, doc };
}

async function putDoc(body: RoomDoc, etag: string): Promise<boolean> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (etagSupported && etag) headers['if-match'] = etag;
  const res = await fetch(roomUrl(cfg!), { method: 'PUT', headers, body: JSON.stringify(body) });
  if (res.ok) return true;
  if (res.status === 412) return false; // 競合。取り直してやり直す
  throw new Error(`PUT ${res.status}`);
}

// 未送信の操作を、サーバの最新状態の上に載せ直してから書き込む
async function flush(): Promise<void> {
  if (!cfg || !hooks || flushing || pending.length === 0) return;
  flushing = true;
  const fns = pending.splice(0);
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const { etag, doc } = await getDoc();
      const local = hooks.getLocal();
      const base: Data = doc?.payload
        ? ({ ...structuredClone(doc.payload), ai: local.ai } as Data)
        : structuredClone(local);
      fns.forEach((f) => f(base));
      const body: RoomDoc = {
        rev: (doc?.rev ?? 0) + 1,
        updatedAt: Date.now(),
        by: deviceId,
        payload: snapshot(base),
      };
      if (await putDoc(body, etag)) {
        localRev = body.rev;
        hooks.adopt(body.payload);
        setStatus('online');
        flushing = false;
        if (pending.length) schedule();
        return;
      }
    }
    throw new Error('競合が続いたため中断しました');
  } catch (e) {
    pending.unshift(...fns); // 失われないよう戻して後で再試行
    setStatus('offline', e instanceof Error ? e.message : String(e));
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { retryTimer = null; void flush(); }, RETRY_DELAY);
  } finally {
    flushing = false;
  }
}

function schedule() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { flushTimer = null; void flush(); }, FLUSH_DELAY);
}

function onEvent(ev: MessageEvent) {
  if (!hooks) return;
  let msg: { path: string; data: unknown };
  try {
    msg = JSON.parse(ev.data);
  } catch {
    return;
  }
  if (msg.data == null) return;
  // 未送信の操作がある間は採用しない（このあとの flush が最新の上に載せ直す）
  if (pending.length > 0 || flushing) return;
  if (msg.path === '/') {
    const doc = msg.data as RoomDoc;
    if (!doc.payload || doc.rev <= localRev) return; // 自分の書き込みのエコーは無視
    localRev = doc.rev;
    hooks.adopt(doc.payload);
  } else {
    void refresh();
  }
}

async function refresh() {
  if (!cfg || !hooks) return;
  try {
    const { doc } = await getDoc();
    if (doc?.payload && doc.rev > localRev && pending.length === 0 && !flushing) {
      localRev = doc.rev;
      hooks.adopt(doc.payload);
    }
  } catch { /* 次のイベントで拾う */ }
}

function connect() {
  if (!cfg) return;
  setStatus('connecting');
  es = new EventSource(roomUrl(cfg));
  es.addEventListener('put', onEvent as EventListener);
  es.addEventListener('patch', onEvent as EventListener);
  es.onopen = () => setStatus('online');
  // EventSource は自動で再接続するので、ここでは表示を切り替えるだけ
  es.onerror = () => setStatus('offline', '接続が切れました。再接続を試みています');
}

/* ---------------- 公開API ---------------- */

// 部屋に接続する。部屋が空なら手元のデータで作り、データがあればそれを採用する
export async function startSync(c: SyncConfig, h: Hooks): Promise<void> {
  stopSync();
  cfg = c;
  hooks = h;
  localRev = 0;
  etagSupported = true;
  setStatus('connecting');
  try {
    const { etag, doc } = await getDoc();
    if (doc?.payload) {
      localRev = doc.rev ?? 0;
      h.adopt(doc.payload);
    } else {
      const body: RoomDoc = { rev: 1, updatedAt: Date.now(), by: deviceId, payload: snapshot(h.getLocal()) };
      if (await putDoc(body, etag)) localRev = 1;
    }
    connect();
  } catch (e) {
    setStatus('error', e instanceof Error ? e.message : String(e));
  }
}

export function stopSync(): void {
  if (es) { es.close(); es = null; }
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  cfg = null;
  hooks = null;
  pending = [];
  flushing = false;
  localRev = 0;
}

export function isSyncActive(): boolean {
  return cfg != null;
}

export function pushMutation(fn: (d: Data) => void): void {
  if (!cfg) return;
  pending.push(fn);
  schedule();
}

export function pendingCount(): number {
  return pending.length;
}

// 他の端末に共有する参加用リンク
export function joinLink(c: SyncConfig): string {
  const base = location.origin + location.pathname;
  return `${base}#s=${encodeURIComponent(c.dbUrl)}|${encodeURIComponent(c.room)}`;
}

export function parseJoinHash(hash: string): SyncConfig | null {
  if (!hash.startsWith('#s=')) return null;
  const [u, r] = hash.slice(3).split('|');
  if (!u || !r) return null;
  const dbUrl = normalizeDbUrl(decodeURIComponent(u));
  const room = decodeURIComponent(r);
  return dbUrl && room ? { dbUrl, room } : null;
}
