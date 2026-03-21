import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
  variant?: 'default' | 'error';
  forceShow?: boolean;
}

export function Tooltip({ content, children, position = 'bottom', className = '', delay = 0, variant = 'default', forceShow = false }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const show = isHovered || forceShow;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (show && wrapperRef.current && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const parent = wrapperRef.current.closest('.overflow-hidden, .overflow-auto, .overflow-x-hidden');
      const padding = 8;
      
      let boundLeft = padding;
      let boundRight = window.innerWidth - padding;

      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        boundLeft = Math.max(padding, parentRect.left + padding);
        boundRight = Math.min(window.innerWidth - padding, parentRect.right - padding);
      }
      
      let newOffset = 0;
      if (tooltipRect.left < boundLeft) {
        newOffset = boundLeft - tooltipRect.left;
      } else if (tooltipRect.right > boundRight) {
        newOffset = boundRight - tooltipRect.right;
      }
      
      setOffset(prev => prev + newOffset);
    } else if (!show) {
      setOffset(0);
    }
  }, [show]);

  let positionClass = '';
  let arrowClass = '';
  let initialAnim = {};
  let exitAnim = {};

  switch (position) {
    case 'bottom':
      positionClass = 'top-full left-1/2 -translate-x-1/2 mt-[9px]';
      arrowClass = `bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent ${variant === 'error' ? 'border-b-[#FF3B30]' : 'border-b-[#1C1C1E] dark:border-b-[#F2F2F7]'}`;
      initialAnim = { opacity: 0, y: 3, scale: 0.95 };
      exitAnim = { opacity: 0, y: 3, scale: 0.95 };
      break;
    case 'top':
      positionClass = 'bottom-full left-1/2 -translate-x-1/2 mb-[9px]';
      arrowClass = `top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent ${variant === 'error' ? 'border-t-[#FF3B30]' : 'border-t-[#1C1C1E] dark:border-t-[#F2F2F7]'}`;
      initialAnim = { opacity: 0, y: -3, scale: 0.95 };
      exitAnim = { opacity: 0, y: -3, scale: 0.95 };
      break;
    case 'left':
      positionClass = 'right-full top-1/2 -translate-y-1/2 mr-[9px]';
      arrowClass = `left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-transparent ${variant === 'error' ? 'border-l-[#FF3B30]' : 'border-l-[#1C1C1E] dark:border-l-[#F2F2F7]'}`;
      initialAnim = { opacity: 0, x: -3, scale: 0.95 };
      exitAnim = { opacity: 0, x: -3, scale: 0.95 };
      break;
    case 'right':
      positionClass = 'left-full top-1/2 -translate-y-1/2 ml-[9px]';
      arrowClass = `right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-transparent ${variant === 'error' ? 'border-r-[#FF3B30]' : 'border-r-[#1C1C1E] dark:border-r-[#F2F2F7]'}`;
      initialAnim = { opacity: 0, x: 3, scale: 0.95 };
      exitAnim = { opacity: 0, x: 3, scale: 0.95 };
      break;
  }

  return (
    <div 
      ref={wrapperRef}
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {show && content && (
          <motion.div
            ref={tooltipRef}
            key="tooltip"
            initial={initialAnim as any}
            animate={{ 
              opacity: 1, 
              x: (position === 'top' || position === 'bottom') ? offset : 0, 
              y: 0, 
              scale: 1 
            }}
            exit={exitAnim as any}
            transition={{ duration: 0.15, ease: "easeOut", delay: delay }}
            className={`absolute ${positionClass} min-w-max z-[100] px-3.5 py-1.5 ${variant === 'error' ? 'bg-[#FF3B30] text-white shadow-[0_4px_16px_rgba(255,59,48,0.25)]' : 'bg-[#1C1C1E] dark:bg-[#F2F2F7] text-[#F2F2F7] dark:text-[#1C1C1E] shadow-[0_4px_16px_rgba(0,0,0,0.12)]'} text-[12px] font-medium tracking-[0.01em] rounded-[8px] whitespace-nowrap pointer-events-none`}
          >
            {content}
            <div 
              className={`absolute ${arrowClass}`} 
              style={{ 
                transform: (position === 'top' || position === 'bottom') 
                  ? `translateX(calc(-50% - ${offset}px))` 
                  : undefined 
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
