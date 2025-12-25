import React from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn('flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    />
  );
}
