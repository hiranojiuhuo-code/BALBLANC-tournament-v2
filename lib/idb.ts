import type { ArchiveEntry } from './types';

// 取り込みアーカイブ（写真＋読み取り結果、IndexedDBに保存）。参照実装と同一のDB/store名・形式
const IDB_NAME = 'tennis_archive';
const IDB_STORE = 'imports';

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const q = indexedDB.open(IDB_NAME, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}

export async function archiveAdd(entry: ArchiveEntry): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(entry);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function archiveList(): Promise<ArchiveEntry[]> {
  const db = await idb();
  return new Promise((res, rej) => {
    const q = db.transaction(IDB_STORE).objectStore(IDB_STORE).getAll();
    q.onsuccess = () => res(q.result || []);
    q.onerror = () => rej(q.error);
  });
}

export async function archiveGet(id: string): Promise<ArchiveEntry | undefined> {
  const db = await idb();
  return new Promise((res, rej) => {
    const q = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(id);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}

export async function archiveDel(id: string): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
