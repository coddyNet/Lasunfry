import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from 'features/theme';
import { Sun, Moon } from 'lucide-react';
import { BrandIcon } from 'components/BrandIcon';
import { Branding } from 'components/Branding';
import { Tooltip } from 'components/Tooltip';

export function LoginPageLayout() {
  const { login } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light p-6 dark:bg-background-dark relative overflow-hidden">
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

      <div className="absolute inset-0 z-0 opacity-5">
        <h1 className="absolute -left-10 sm:-left-20 top-0 text-[40vw] sm:text-[30vw] font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
          LASUN
        </h1>
        <h1 className="absolute -right-10 sm:-right-20 bottom-0 text-[40vw] sm:text-[30vw] font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
          FRY
        </h1>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 text-center">
        <div className="flex h-32 w-32 items-center justify-center -mb-4">
          <BrandIcon size={180} />
        </div>
        <div className="space-y-4">
          <h1 className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            Lasunfry
          </h1>
          <p className="max-w-md text-lg font-medium text-slate-500 dark:text-slate-400">
            A modern, clean markdown editor and note-taking application for your masterpieces.
          </p>
        </div>
        <button
          onClick={login}
          className="group flex items-center gap-4 rounded-xl bg-white px-10 py-4 text-lg font-bold text-slate-700 shadow-xl transition-all hover:shadow-2xl hover:scale-105 active:scale-95 border border-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>
          Sign in with Google
        </button>
      </div>

      <Branding />
    </div>
  );
}
