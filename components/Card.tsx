import React from 'react';

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-line bg-panel p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2 className={`mb-3 flex flex-wrap items-center gap-2 font-display text-sm font-extrabold tracking-wide text-ink ${className}`}>
      {children}
    </h2>
  );
}

export function Banner({ variant = 'info', className = '', children }: {
  variant?: 'info' | 'warn' | 'danger';
  className?: string;
  children: React.ReactNode;
}) {
  const map = {
    info: 'border-cyan/25 bg-cyan/8 text-ink/90',
    warn: 'border-warn/35 bg-warn/10 text-warn',
    danger: 'border-bad/35 bg-bad/10 text-bad',
  } as const;
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed ${map[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`font-num inline-block rounded-md border border-line bg-panel2 px-2 py-0.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}
