'use client';

import React from 'react';

export function Chip({ on, onClick, children }: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-bold transition ${
        on
          ? 'border-cyan/60 bg-cyan/15 text-cyan'
          : 'border-line bg-panel text-mute hover:border-cyan/40 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 flex flex-wrap gap-1.5">{children}</div>;
}
