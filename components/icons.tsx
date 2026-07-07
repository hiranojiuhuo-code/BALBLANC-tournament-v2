import React from 'react';

type P = React.SVGProps<SVGSVGElement>;

function base(props: P): P {
  return {
    width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

export const IconBoard = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 5v14M3 12h18" /></svg>
);
export const IconList = (p: P) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>
);
export const IconTrophy = (p: P) => (
  <svg {...base(p)}><path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></svg>
);
export const IconUsers = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M15 14a6 6 0 0 1 6 6" /></svg>
);
export const IconChart = (p: P) => (
  <svg {...base(p)}><path d="M4 4v16h16" /><path d="M8 16v-5M12 16V8M16 16v-3M20 16V6" /></svg>
);
export const IconCamera = (p: P) => (
  <svg {...base(p)}><path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const IconSave = (p: P) => (
  <svg {...base(p)}><path d="M5 4h11l3 3v13H5V4Z" /><path d="M8 4v5h7V4M8 14h8v6H8v-6Z" /></svg>
);
export const IconGear = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2" /></svg>
);
export const IconMore = (p: P) => (
  <svg {...base(p)}><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>
);
export const IconUp = (p: P) => <svg {...base(p)}><path d="M6 14l6-6 6 6" /></svg>;
export const IconDown = (p: P) => <svg {...base(p)}><path d="M6 10l6 6 6-6" /></svg>;

export function BallLogo({ className = '' }: { className?: string }) {
  // SVGのid参照はページ全体で解決されるため、複数配置しても衝突しないようインスタンスごとに一意化する
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `ballclip-${uid}`;
  const gradId = `ballgrad-${uid}`;
  return (
    <svg viewBox="0 0 26 26" className={className} aria-hidden width="100%" height="100%">
      <defs>
        <clipPath id={clipId}><circle cx="13" cy="13" r="13" /></clipPath>
        <radialGradient id={gradId} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#e8f76a" />
          <stop offset="55%" stopColor="#cbe030" />
          <stop offset="100%" stopColor="#9ab510" />
        </radialGradient>
      </defs>
      <circle cx="13" cy="13" r="13" fill={`url(#${gradId})`} />
      <g clipPath={`url(#${clipId})`} fill="none" stroke="#ffffff" strokeWidth="1.8" opacity=".9">
        <circle cx="-1" cy="-1" r="13" />
        <circle cx="27" cy="27" r="13" />
      </g>
    </svg>
  );
}
