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
}

export function TopNav({ isSidebarOpen, setIsSidebarOpen, setHoveredUrl }: TopNavProps) {
  const { user, logout } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { setActiveFileId, setOpenFileIds } = useFile();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-100 bg-white/40 px-3 md:px-6 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 sticky top-0 z-40">
      <div className="flex items-center gap-2 md:gap-6">
        <Tooltip title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'} position="bottom">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </Tooltip>
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-3 group cursor-pointer" 
            onClick={() => { setActiveFileId(''); setOpenFileIds([]); navigate('/'); }}
            onMouseEnter={() => setHoveredUrl(`${window.location.origin}/`)}
            onMouseLeave={() => setHoveredUrl(null)}
          >
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center">
              <BrandIcon size={32} className="md:w-10 md:h-10" />
            </div>
            <h2 className="text-base md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase truncate max-w-[100px] sm:max-w-none">Lasunfry</h2>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-4">
        <div className="flex items-center gap-1">
          <Tooltip title={isDarkMode ? "Toggle Light Mode" : "Toggle Dark Mode"} position="bottom">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 md:gap-4 border-l border-slate-200 pl-1 md:pl-4 dark:border-slate-800">
          <div className="flex items-center gap-1.5 rounded-xl bg-white/50 px-1.5 md:px-3 py-1 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-100 dark:border-slate-800">
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
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 dark:hover:bg-red-950/30"
            >
              <LogOut size={18} />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
