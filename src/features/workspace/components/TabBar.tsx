import React from 'react';
import { Type, X, Plus } from 'lucide-react';
import { useFile, File as FileType } from '../context/FileContext';
import { Tooltip } from 'components/Tooltip';

interface TabBarProps {
  // Rename functionality removed from TabBar as per user request
}

export function TabBar() {
  const { openFiles, activeFileId, openFile, closeTab } = useFile();

  return (
    <div className="flex border-b border-slate-100 bg-white/40 px-2 md:px-4 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 overflow-x-auto no-scrollbar scroll-smooth">
      <div className="flex h-12 items-center gap-1 min-w-max">
        {openFiles.map(file => (
          <div
            key={file.id}
            onClick={() => openFile(file.id)}
            className={`flex h-full items-center gap-2 border-b-2 px-4 text-[13px] font-semibold cursor-pointer transition-all duration-300 ${
              activeFileId === file.id
                ? 'border-google-blue text-google-blue'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Type size={14} />
            {file.name.replace(/\.(txt|md)$/i, '')}
            <button
              onClick={(e) => closeTab(file.id, e)}
              className={`ml-1 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 ${
                activeFileId === file.id ? 'text-google-blue' : 'text-slate-400'
              }`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
