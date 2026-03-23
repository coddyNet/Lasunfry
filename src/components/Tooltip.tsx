import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  title: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'default' | 'error';
  forceShow?: boolean;
}

export function Tooltip({ 
  title, 
  content,
  children, 
  position = 'top', 
  variant = 'default',
  forceShow = false
}: TooltipProps & { content?: string }) {
  const displayTitle = title || content;
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const show = (isVisible || forceShow);

  useLayoutEffect(() => {
    if (show && triggerRef.current && isMounted) {
      const updateCoords = () => {
        if (!triggerRef.current) return;
        
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipWidth = tooltipRef.current?.offsetWidth || 120;
        const tooltipHeight = tooltipRef.current?.offsetHeight || 32;
        
        const gap = 8;
        let newTop = 0;
        let newLeft = 0;

        if (position === 'top') {
          newTop = triggerRect.top - tooltipHeight - gap;
          newLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        } else if (position === 'bottom') {
          newTop = triggerRect.bottom + gap;
          newLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
        } else if (position === 'left') {
          newTop = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
          newLeft = triggerRect.left - tooltipWidth - gap;
        } else if (position === 'right') {
          newTop = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);
          newLeft = triggerRect.left + triggerRect.width + gap;
        }

        const padding = 12;
        if (newLeft < padding) newLeft = padding;
        if (newLeft + tooltipWidth > window.innerWidth - padding) {
          newLeft = window.innerWidth - tooltipWidth - padding;
        }
        if (newTop < padding) newTop = padding;
        if (newTop + tooltipHeight > window.innerHeight - padding) {
          newTop = window.innerHeight - tooltipHeight - padding;
        }

        if (newTop !== coords.top || newLeft !== coords.left) {
          setCoords({ top: newTop, left: newLeft });
        }
      };

      updateCoords();
      const timer = setTimeout(updateCoords, 16);
      return () => clearTimeout(timer);
    }
  }, [show, position, isMounted, displayTitle, coords.top, coords.left]);

  const arrowClass = {
    top: `bottom-[-4px] left-1/2 -translate-x-1/2 border-t-[4px] ${variant === 'error' ? 'border-t-red-500' : 'border-t-white dark:border-t-slate-800'}`,
    bottom: `top-[-4px] left-1/2 -translate-x-1/2 border-b-[4px] ${variant === 'error' ? 'border-b-red-500' : 'border-b-white dark:border-b-slate-800'}`,
    left: `right-[-4px] top-1/2 -translate-y-1/2 border-l-[4px] ${variant === 'error' ? 'border-l-red-500' : 'border-l-white dark:border-l-slate-800'}`,
    right: `left-[-4px] top-1/2 -translate-y-1/2 border-r-[4px] ${variant === 'error' ? 'border-r-red-500' : 'border-r-white dark:border-r-slate-800'}`
  }[position];

  if (!displayTitle) return <>{children}</>;

  return (
    <div 
      ref={triggerRef}
      className="inline-flex items-center justify-center h-full min-w-[34px]"
      onPointerEnter={() => setIsVisible(true)}
      onPointerLeave={() => setIsVisible(false)}
    >
      {children}
      {isMounted && createPortal(
        <AnimatePresence>
          {show && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: 99999,
                pointerEvents: 'none'
              }}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] border ${
                variant === 'error'
                  ? 'bg-red-500 text-white border-red-400'
                  : 'bg-white text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700'
              }`}
            >
              {displayTitle}
              <div className={`absolute border-l-[4px] border-r-[4px] border-transparent ${arrowClass}`} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export function ToolbarButton({ onClick, icon, label, active = false, className = "", variant = 'default', forceShow = false }: any) {
  return (
    <Tooltip title={label} variant={variant} forceShow={forceShow}>
      <button
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        className={`flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-all duration-200 ${
          active ? 'bg-google-blue text-white shadow-lg shadow-google-blue/20' : 
          variant === 'error' ? 'text-red-500 dark:text-red-400' : 
          'text-slate-500 dark:text-slate-400'
        } ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
