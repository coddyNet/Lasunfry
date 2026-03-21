import React from 'react';
import { Type, X, Plus } from 'lucide-react';
import { useFile, File as FileType } from '../context/FileContext';
import { Tooltip } from 'components/Tooltip';

interface TabBarProps {
  editingFileId: { id: string; location: 'sidebar' | 'tab' } | null;
  setEditingFileId: (val: { id: string; location: 'sidebar' | 'tab' } | null) => void;
  editingFileName: string;
  setEditingFileName: React.Dispatch<React.SetStateAction<string>>;
  startRenaming: (file: FileType, e: React.MouseEvent, location: 'sidebar' | 'tab') => void;
  submitRename: () => void;
  isRenamingRef: React.MutableRefObject<boolean>;
}

export function TabBar({
  editingFileId,
  setEditingFileId,
  editingFileName,
  setEditingFileName,
  startRenaming,
  submitRename,
  isRenamingRef
}: TabBarProps) {
  const { openFiles, activeFileId, setActiveFileId, closeTab, handleCreateFile } = useFile();

  return (
    <div className="flex border-b border-slate-100 bg-white/40 px-2 md:px-4 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 overflow-x-auto no-scrollbar scroll-smooth">
      <div className="flex h-12 items-center gap-1 min-w-max">
        {openFiles.map(file => (
          <div
            key={file.id}
            onClick={() => setActiveFileId(file.id)}
            onDoubleClick={(e) => startRenaming(file, e, 'tab')}
            className={`flex h-full items-center gap-2 border-b-2 px-4 text-[13px] font-semibold cursor-pointer transition-all duration-300 ${
              activeFileId === file.id
                ? 'border-google-blue text-google-blue'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Type size={14} />
            {editingFileId?.id === file.id && editingFileId.location === 'tab' ? (
              <input
                autoFocus
                className="bg-transparent outline-none border-b border-google-blue text-google-blue"
                value={editingFileName.replace(/\.(txt|md)$/i, '')}
                onChange={(e) => setEditingFileName(e.target.value)}
                onBlur={() => {
                  const ext = file.name.match(/\.(txt|md)$/i)?.[0] ?? '.txt';
                  if (editingFileName && !editingFileName.match(/\.(txt|md)$/i)) {
                    setEditingFileName(editingFileName + ext);
                  }
                  submitRename();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const ext = file.name.match(/\.(txt|md)$/i)?.[0] ?? '.txt';
                    if (editingFileName && !editingFileName.match(/\.(txt|md)$/i)) {
                      setEditingFileName(prev => prev + ext);
                    }
                    e.currentTarget.blur();
                  }
                  if (e.key === 'Escape') {
                    setEditingFileId(null);
                    isRenamingRef.current = false;
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              file.name.replace(/\.(txt|md)$/i, '')
            )}
            <Tooltip content="Close Note" position="bottom" delay={0.3}>
              <button
                onClick={(e) => closeTab(file.id, e)}
                className={`ml-1 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 ${
                  activeFileId === file.id ? 'text-google-blue' : 'text-slate-400'
                }`}
              >
                <X size={12} />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
}
