'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

export function Modal({ title, onClose, wide, children }: {
  title?: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`anim-modal w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[88vh] overflow-auto rounded-2xl border border-line border-t-2 border-t-neon bg-panel p-5 shadow-2xl`}>
        {title && <h3 className="mb-4 font-display text-lg font-extrabold">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

export function Confirm({ message, okLabel = 'OK', danger, onOk, onClose }: {
  message: string;
  okLabel?: string;
  danger?: boolean;
  onOk: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="確認" onClose={onClose}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{message}</p>
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onClose(); onOk(); }}>{okLabel}</Button>
      </ModalActions>
    </Modal>
  );
}

export function Prompt({ title, initial = '', onOk, onClose }: {
  title: string;
  initial?: string;
  onOk: (v: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 30);
    return () => clearTimeout(t);
  }, []);
  const submit = () => {
    onClose();
    onOk(v);
  };
  return (
    <Modal title={title} onClose={onClose}>
      <input
        ref={ref}
        type="text"
        className="input"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <ModalActions>
        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        <Button variant="primary" onClick={submit}>OK</Button>
      </ModalActions>
    </Modal>
  );
}
