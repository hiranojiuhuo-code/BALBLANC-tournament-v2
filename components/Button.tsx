'use client';

import React from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'ghost' | 'done' | 'danger';
type Size = 'md' | 'sm';

const styles: Record<Variant, string> = {
  primary: 'bg-neon text-[var(--on-accent)] glow-neon hover:brightness-105',
  ghost: 'border border-line bg-panel2 text-ink hover:border-cyan/50',
  done: 'bg-cyan text-[var(--on-accent)] glow-cyan hover:brightness-105',
  danger: 'border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20',
};
const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-sm',
  sm: 'min-h-11 px-3 text-xs',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  href?: string;
};

export function Button({ variant = 'ghost', size = 'md', href, className = '', children, ...rest }: Props) {
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${styles[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
