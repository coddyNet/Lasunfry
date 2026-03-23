import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', variant = 'rect', style }: SkeletonProps) {
  const baseClasses = "relative overflow-hidden bg-slate-100 dark:bg-slate-900/50";
  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-3 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} style={style}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]" />
    </div>
  );
}
