import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white shadow-md hover:shadow-lg hover:from-[#8B5CF6] hover:to-[#A78BFA] active:scale-95',
        outline: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
        ghost: 'hover:bg-gray-100 text-gray-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? 'span' : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
