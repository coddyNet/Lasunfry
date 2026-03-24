import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeft, Sun, Moon, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from 'features/auth';
import { useTheme } from 'features/theme';
import { useFile } from '../context/FileContext';
import { BrandIcon } from 'components/BrandIcon';
import { Tooltip } from 'components/Tooltip';

interface TopNavProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  setHoveredUrl: (url: string | null) => void;
  onAction?: (step: number) => void;
  onStartTour?: () => void;
}

export function TopNav({ isSidebarOpen, setIsSidebarOpen, setHoveredUrl, onAction, onStartTour }: TopNavProps) {
  const { user, logout } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { setActiveFileId, setOpenFileIds } = useFile();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-slate-100 bg-white/40 px-3 md:px-6 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 sticky top-0 z-40">
      <div className="flex items-center gap-1 md:gap-6">
        <Tooltip title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'} position="bottom">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </Tooltip>
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-3 shrink-0 group cursor-pointer" 
            onClick={() => { 
              if (onStartTour) {
                onStartTour();
              } else {
                setActiveFileId(''); 
                setOpenFileIds([]); 
                navigate('/');
              }
            }}
            onMouseEnter={() => setHoveredUrl(`${window.location.origin}/`)}
            onMouseLeave={() => setHoveredUrl(null)}
          >
            <div className="flex h-9 w-9 md:h-12 md:w-12 items-center justify-center shrink-0">
              <BrandIcon size={24} className="md:w-10 md:h-10" />
            </div>
            <h2 className="hidden sm:block text-sm md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase truncate max-w-[80px] sm:max-w-none leading-none">Lasunfry</h2>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <Tooltip title={isDarkMode ? "Toggle Light Mode" : "Toggle Dark Mode"} position="bottom">
            <button
              id="tour-theme-toggle"
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                if (onAction) onAction(6);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 md:gap-4 md:border-l md:border-slate-200 md:pl-4 dark:border-slate-800">
          <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg md:rounded-xl bg-white/50 px-1.5 md:px-3 py-1 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-100 dark:border-slate-800">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="h-5 w-5 md:h-6 md:w-6 rounded-full" />
            ) : (
              <UserIcon size={14} className="text-slate-500" />
            )}
            <span className="hidden sm:inline text-[10px] md:text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[60px] md:max-w-none">{user.displayName}</span>
          </div>
          <Tooltip title="Sign Out" position="bottom">
            <button
              onClick={logout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 dark:hover:bg-red-950/30"
            >
              <LogOut size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
