import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  title: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  variant?: 'default' | 'error';
  forceShow?: boolean;
}

export function Tooltip({ 
  title, 
  content,
  children, 
  position = 'top', 
  delay = 0,
  variant = 'default',
  forceShow = false
}: TooltipProps & { content?: string }) {
  const displayTitle = title || content;
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const show = (isVisible || forceShow) && !isMobile;
  console.log('Tooltip show:', { isVisible, forceShow, isMobile, show, title });

  useLayoutEffect(() => {
    if (show && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const gap = 8;
      
      let newTop = 0;
      let newLeft = 0;

      if (position === 'top') {
        newTop = triggerRect.top - tooltipRect.height - gap;
        newLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      } else if (position === 'bottom') {
        newTop = triggerRect.bottom + gap;
        newLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      } else if (position === 'left') {
        newTop = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        newLeft = triggerRect.left - tooltipRect.width - gap;
      } else if (position === 'right') {
        newTop = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        newLeft = triggerRect.left + triggerRect.width + gap;
      }

      // Viewport bounds check
      const padding = 12;
      if (newLeft < padding) newLeft = padding;
      if (newLeft + tooltipRect.width > window.innerWidth - padding) {
        newLeft = window.innerWidth - tooltipRect.width - padding;
      }
      if (newTop < padding) newTop = padding;
      if (newTop + tooltipRect.height > window.innerHeight - padding) {
        newTop = window.innerHeight - tooltipRect.height - padding;
      }

      setCoords({ top: newTop, left: newLeft });
    }
  }, [show, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }[position];

  const arrowClass = {
    top: `bottom-[-4px] left-1/2 -translate-x-1/2 border-t-[4px] ${variant === 'error' ? 'border-t-red-500' : 'border-t-slate-900 dark:border-t-slate-800'}`,
    bottom: `top-[-4px] left-1/2 -translate-x-1/2 border-b-[4px] ${variant === 'error' ? 'border-b-red-500' : 'border-b-slate-900 dark:border-b-slate-800'}`,
    left: `right-[-4px] top-1/2 -translate-y-1/2 border-l-[4px] ${variant === 'error' ? 'border-l-red-500' : 'border-l-slate-900 dark:border-l-slate-800'}`,
    right: `left-[-4px] top-1/2 -translate-y-1/2 border-r-[4px] ${variant === 'error' ? 'border-r-red-500' : 'border-r-slate-900 dark:border-r-slate-800'}`
  }[position];

  return (
    <div 
      ref={triggerRef}
      className="relative flex items-center" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{ 
              top: coords.top,
              left: coords.left
            }}
            className={`fixed z-[9999] hidden md:block whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-2xl pointer-events-none ${
              variant === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-slate-900 text-white dark:bg-slate-800'
            }`}
          >
             {displayTitle}
            <div className={`absolute border-l-[4px] border-r-[4px] border-transparent ${arrowClass}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  className?: string;
  variant?: 'default' | 'error';
  forceShow?: boolean;
}

export function ToolbarButton({ 
  onClick, 
  icon, 
  label, 
  active = false, 
  className = "",
  variant = 'default',
  forceShow = false
}: ToolbarButtonProps) {
  return (
    <Tooltip title={label} variant={variant} forceShow={forceShow}>
      <button
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-all duration-200 ${
          active
            ? 'bg-google-blue text-white shadow-lg shadow-google-blue/20'
            : variant === 'error'
              ? 'text-red-500 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-400'
        } ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
