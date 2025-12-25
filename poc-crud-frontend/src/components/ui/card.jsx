import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-white shadow-soft', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('px-4 py-3 border-b border-neutral-200', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-semibold text-neutral-800', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4', className)} {...props} />;
}
