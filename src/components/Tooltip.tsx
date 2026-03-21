import React, { useState, useEffect, useRef } from 'react';
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = isVisible || forceShow;

  useEffect(() => {
    if (show && tooltipRef.current && triggerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      
      // Find the nearest overflow-restricted parent (e.g., the Sidebar or Main container)
      let parent = triggerRef.current.parentElement;
      let boundary = { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
      
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflow !== 'visible' || style.overflowX !== 'visible' || style.overflowY !== 'visible') {
          const rect = parent.getBoundingClientRect();
          boundary = rect;
          break;
        }
        parent = parent.parentElement;
      }

      let newOffsetX = 0;
      let newOffsetY = 0;

      // Vertical positions (top/bottom)
      if (position === 'top' || position === 'bottom') {
        const tooltipCenterX = triggerRect.left + triggerRect.width / 2;
        const halfWidth = tooltipRect.width / 2;
        
        const leftEdge = tooltipCenterX - halfWidth;
        const rightEdge = tooltipCenterX + halfWidth;

        if (leftEdge < boundary.left + 12) {
          newOffsetX = (boundary.left + 12) - leftEdge;
        } else if (rightEdge > boundary.right - 12) {
          newOffsetX = (boundary.right - 12) - rightEdge;
        }
      }

      setOffset({ x: newOffsetX, y: newOffsetY });
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
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 4 : -4 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              x: offset.x 
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className={`absolute z-[100] whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-2xl pointer-events-none ${positionClass} ${
              variant === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-slate-900 text-white dark:bg-slate-800'
            }`}
          >
             {displayTitle}
            <div className={`absolute border-l-[4px] border-r-[4px] border-transparent ${arrowClass}`} style={{ transform: `translateX(${-offset.x}px) translate(-50%, ${position === 'top' ? '0' : '0'})` }} />
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
              ? 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        } ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
