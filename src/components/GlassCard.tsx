import React from 'react';
import { cn } from '../lib/utils';

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-2xl overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
