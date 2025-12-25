import React from 'react';
import { cn } from '../../lib/utils';

export function Avatar({ className, src, alt, children }) {
  return (
    <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-neutral-700', className)}>
      {src ? <img src={src} alt={alt} className="h-full w-full rounded-full object-cover" /> : children}
    </span>
  );
}
