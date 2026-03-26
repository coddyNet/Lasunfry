import React from 'react';
import { Branding } from 'components/Branding';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Sun, Moon } from 'lucide-react';
import { BrandIcon } from 'components/BrandIcon';
import { Tooltip } from 'components/Tooltip';
import { useTheme } from 'features/theme';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useTheme();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background-light p-6 dark:bg-background-dark relative overflow-hidden">
      {/* Theme Toggle - Matching Login Page */}
      <div className="fixed top-2 right-2 md:top-6 md:right-6 z-50">
        <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} position="bottom">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 text-slate-600 shadow-xl backdrop-blur-md hover:bg-white dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200 border border-slate-100 dark:border-slate-800"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </Tooltip>
      </div>

      {/* Background Decorative Text - Matching Login Page */}
      <div className="absolute inset-0 z-0 opacity-5">
        <h1 className="absolute -left-10 sm:-left-20 top-0 text-[40vw] sm:text-[30vw] font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
          LASUN
        </h1>
        <h1 className="absolute -right-10 sm:-right-20 bottom-0 text-[40vw] sm:text-[30vw] font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
          FRY
        </h1>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute h-32 w-32 animate-pulse rounded-full bg-google-blue/10 blur-3xl dark:bg-google-blue/5"></div>
          <BrandIcon size={120} className="relative z-10" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            UNKNOWN
          </h1>
          <p className="max-w-md text-lg font-medium text-slate-500 dark:text-slate-400">
            Oops! This page has vanished into thin air.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row mt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/50 px-8 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-white backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Home size={18} />
            Back to Home
          </button>
        </div>
      </div>

      <Branding />
    </div>
  );
}
