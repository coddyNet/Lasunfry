import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StatusBarProps {
  url: string | null;
}

export function StatusBar({ url }: StatusBarProps) {
  return (
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 z-[100] max-w-[400px] truncate rounded-tr-md bg-white/90 px-2 py-0.5 text-[11px] font-mono text-slate-500 shadow-sm backdrop-blur-md dark:bg-slate-900/90 dark:text-slate-400 border-t border-r border-slate-200 dark:border-slate-800"
        >
          {url}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
