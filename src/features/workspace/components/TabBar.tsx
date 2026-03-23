import React from 'react';
import { Type, X, Plus, Share2, Download } from 'lucide-react';
import { useFile, File as FileType } from '../context/FileContext';
import { Tooltip } from 'components/Tooltip';
import { Skeleton } from 'components/Skeleton';

interface TabBarProps {
  onShare: () => void;
}

export function TabBar({ onShare }: TabBarProps) {
  const { openFiles, activeFileId, openFile, closeTab, isLoading, downloadFile, activeFile } = useFile();

  return (
    <div className="flex border-b border-slate-100 bg-white/40 px-2 md:px-4 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 w-full">
      <div className="flex-1 flex h-12 items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
        {isLoading ? (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-8 w-28 mx-1" />
            ))}
          </div>
        ) : (
          openFiles.map(file => (
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
          ))
        )}
      </div>
      
    </div>
  );
}
