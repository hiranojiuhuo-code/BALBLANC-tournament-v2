'use client';

import { create } from 'zustand';

let tid: ReturnType<typeof setTimeout> | undefined;

interface ToastState {
  msg: string | null;
  n: number;
  show: (m: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  msg: null,
  n: 0,
  show: (m) => {
    if (tid) clearTimeout(tid);
    set((s) => ({ msg: m, n: s.n + 1 }));
    tid = setTimeout(() => set({ msg: null }), 1800);
  },
}));

export function toast(m: string) {
  useToast.getState().show(m);
}

export function Toaster() {
  const { msg, n } = useToast();
  if (!msg) return null;
  return (
    <div key={n} className="toast" role="status">
      {msg}
    </div>
  );
}
