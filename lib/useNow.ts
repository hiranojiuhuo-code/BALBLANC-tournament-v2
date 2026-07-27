'use client';

import { useEffect, useState } from 'react';

// 待ち時間や終了見込みは時間とともに変わるので、一定間隔で再描画する
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
