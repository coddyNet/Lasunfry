import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Sparkles, Check, MousePointer2 } from 'lucide-react';

export type InteractionType = 'click' | 'input' | 'none';

interface TourStep {
  targetId?: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  interactionType?: InteractionType;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to LasunFry! 🧄",
    content: "LasunFry is your premium, lightning-fast workspace for notes and ideas. Let's take a quick tour to see how it works.",
    position: 'center'
  },
  {
    targetId: 'tour-create-empty-state',
    title: "Step 1: Create a File",
    content: "Click 'Create your first note' to start your journey.",
    position: 'right',
    interactionType: 'click'
  },
  {
    targetId: 'tour-editor',
    title: "Step 2: Start Writing",
    content: "This is your workspace. Type something to see how the AI-powered editor feels.",
    position: 'bottom',
    interactionType: 'input'
  },
  {
    targetId: 'tour-share-btn',
    title: "Step 3: Share your work",
    content: "Collaboration is key. Click the share button to generate a link or QR code instantly.",
    position: 'bottom',
    interactionType: 'click'
  },
  {
    targetId: 'tour-download-btn',
    title: "Step 4: Save Locally",
    content: "Need your note offline? Click the download button to save it as a file.",
    position: 'bottom',
    interactionType: 'click'
  },
  {
    targetId: 'tour-search',
    title: "Step 5: Find it Fast",
    content: "Searching through your collection is instant. Click the search bar to try it out.",
    position: 'bottom',
    interactionType: 'click'
  },
  {
    targetId: 'tour-theme-toggle',
    title: "Step 6: Theme Toggle",
    content: "Switch between Light and Dark mode anytime to suit your environment.",
    position: 'bottom',
    interactionType: 'click'
  },
  {
    title: "You're All Set! 🎉",
    content: "You've mastered the basics of LasunFry. Enjoy your lightning-fast workspace!",
    position: 'center'
  }
];

interface OnboardingTourProps {
  isActive: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: (completed?: boolean) => void;
}

export function OnboardingTour({ isActive, currentStep, onNext, onPrev, onClose }: OnboardingTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const step = TOUR_STEPS[currentStep];
  const controls = useAnimation();

  // Use a ref to store values for use in effects without triggering re-runs if they change too often
  const stepRef = useRef(step);
  stepRef.current = step;

  const updateRect = useCallback(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const currentStepObj = stepRef.current;
    if (!isActive || !currentStepObj || !currentStepObj.targetId) {
      setTargetRect(null);
      return;
    }

    const el = document.getElementById(currentStepObj.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isActive]);

  useEffect(() => {
    updateRect();
    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    const timer = setTimeout(updateRect, 350);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      clearTimeout(timer);
    };
  }, [updateRect, currentStep]);

  useEffect(() => {
    if (isActive) {
      controls.start({
        scale: [1, 1.01, 1],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
      });
    } else {
      controls.stop();
    }
  }, [isActive, controls]);

  // Safety check: if step is undefined, don't render anything
  // MOVED AFTER HOOKS to comply with Rules of Hooks
  if (!isActive || !step) return null;

  const getTooltipStyle = () => {
    if (!targetRect || step.position === 'center') {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const margin = 28;
    const { top, left, right, bottom, width, height } = targetRect;
    switch (step.position) {
      case 'bottom': return { top: bottom + margin, left: left + width / 2, transform: 'translateX(-50%)' };
      case 'top': return { top: top - margin, left: left + width / 2, transform: 'translate(-50%, -100%)' };
      case 'left': return { top: top + height / 2, left: left - margin, transform: 'translate(-100%, -50%)' };
      case 'right': return { top: top + height / 2, left: right + margin, transform: 'translateY(-50%)' };
      default: return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  const spotlightSize = targetRect ? Math.max(targetRect.width, targetRect.height) * 1.5 : 0;
  const radius = spotlightSize / 2;
  const cx = targetRect ? targetRect.left + targetRect.width / 2 : 0;
  const cy = targetRect ? targetRect.top + targetRect.height / 2 : 0;

  // SVG Path with even-odd fill rule to create a real "hole" for pointer events
  const holePath = targetRect 
    ? `M 0 0 h ${windowSize.width} v ${windowSize.height} h -${windowSize.width} z 
       M ${cx} ${cy} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius*2},0 a ${radius},${radius} 0 1,0 -${radius*2},0`
    : `M 0 0 h ${windowSize.width} v ${windowSize.height} h -${windowSize.width} z`;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* SVG Spotlight Overlay using even-odd fill rule */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-visible">
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          d={holePath}
          fill="rgba(2, 6, 23, 0.75)"
          fillRule="evenodd"
          className="pointer-events-auto cursor-pointer"
          onClick={(e) => {
            // Only close if clicking the actual overlay, not through the hole
            // Since it's even-odd, the hole area shouldn't trigger this usually,
            // but we'll add a safety check if needed.
            onClose(false);
          }}
          style={{ backdropFilter: 'blur(1px)' }}
        />
      </svg>

      {/* Target Interaction Pointer (Subtle Hint) */}
      {targetRect && step.interactionType === 'click' && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute z-[10001] pointer-events-none"
          style={{ top: cy, left: cx }}
        >
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-google-blue/30"
          />
          <MousePointer2 size={24} className="text-white -translate-x-1/2 -translate-y-1/2 drop-shadow-lg fill-google-blue" />
        </motion.div>
      )}

      {/* Ambient Particles */}
      {step.position === 'center' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: Math.random() * windowSize.width, y: Math.random() * windowSize.height, opacity: 0 }}
              animate={{ y: [null, Math.random() * -150], opacity: [0, 0.4, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
              className="absolute h-1.5 w-1.5 rounded-full bg-google-blue/50 blur-[2px]"
            />
          ))}
        </div>
      )}

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, ...getTooltipStyle() }}
          animate={{ opacity: 1, scale: 1, ...getTooltipStyle() }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 28, stiffness: 450 }}
          className="absolute z-[10000] w-[340px] rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.3)] dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-2xl pointer-events-auto"
        >
          <button 
            onClick={() => onClose(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-google-blue/10 text-google-blue shadow-inner group overflow-hidden relative">
            {currentStep === TOUR_STEPS.length - 1 ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                <Check size={26} />
              </motion.div>
            ) : (
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <Sparkles size={26} />
              </motion.div>
            )}
          </div>

          <h4 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">{step.title}</h4>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{step.content}</p>

          {step.interactionType && step.interactionType !== 'none' && (
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-google-blue/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-google-blue animate-pulse">
              <MousePointer2 size={12} />
              Required Action: {step.interactionType === 'click' ? 'Click highlighted button' : 'Type something'}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100/50 pt-5 dark:border-slate-800/50">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${i === currentStep ? 'w-8 bg-google-blue shadow-[0_0_10px_rgba(66,133,244,0.5)]' : 'w-1.5 bg-slate-200 dark:bg-slate-800'}`} />
              ))}
            </div>
            <div className="flex gap-2.5">
              {currentStep > 0 && (
                <button
                  onClick={onPrev}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-all font-bold text-xs"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
              {!step.interactionType || step.interactionType === 'none' ? (
                <button
                  onClick={currentStep === TOUR_STEPS.length - 1 ? () => onClose(true) : onNext}
                  className="flex items-center gap-2 rounded-xl bg-google-blue px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-600 shadow-xl shadow-blue-500/20 transition-all active:scale-95 group"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                  {currentStep < TOUR_STEPS.length - 1 && <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  Waiting...
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
