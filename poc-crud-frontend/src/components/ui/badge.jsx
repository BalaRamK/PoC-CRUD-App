import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, children }) {
  return (
    <span className={cn('inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700', className)}>
      {children}
    </span>
  );
}
