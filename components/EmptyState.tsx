import React from 'react';

export function EmptyState({ icon, title, desc, children }: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel px-6 py-10 text-center">
      {icon && <div className="mb-4 flex justify-center text-cyan">{icon}</div>}
      <h3 className="font-display text-lg font-extrabold">{title}</h3>
      {desc && <p className="mt-2 text-[13px] leading-relaxed text-mute">{desc}</p>}
      {children && <div className="mt-6 flex flex-col items-stretch gap-2">{children}</div>}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="p-5 text-center text-[13px] text-mute">{children}</div>;
}
