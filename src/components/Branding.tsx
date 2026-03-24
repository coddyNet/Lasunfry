import React from 'react';

interface BrandingProps {
  className?: string;
  isFixed?: boolean;
  onStartTour?: () => void;
}

export function Branding({ className = "", isFixed = true, onStartTour }: BrandingProps) {
  const containerClasses = isFixed 
    ? `fixed bottom-12 left-6 z-50 flex flex-col items-start gap-0.5 ${!onStartTour ? 'pointer-events-none' : ''} ${className}`
    : `flex flex-col items-center gap-0.5 ${className}`;

  const alignClasses = isFixed ? "text-left" : "text-center";

  return (
    <div className={containerClasses}>
      <div className={`flex items-center gap-2 ${alignClasses}`}>
        <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 dark:text-slate-500 uppercase opacity-70">
          © ALL RIGHTS RESERVED BY LASUNFRY
        </p>
        {/* Removed Take Tour button per user request */}
      </div>
      <p className={`text-[9px] font-bold tracking-tight text-slate-400 dark:text-slate-600 opacity-50 ${alignClasses}`}>
        Designed and Developed by Coddynet infotech
      </p>
    </div>
  );
}
