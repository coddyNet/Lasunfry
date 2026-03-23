import React from 'react';
import { Search, Plus, FileText, MoreVertical, PanelLeftClose } from 'lucide-react';
import { useFile, File as FileType } from '../context/FileContext';
import { Tooltip } from 'components/Tooltip';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isMobile: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  editingFileId: { id: string; location: 'sidebar' | 'tab' } | null;
  setEditingFileId: (val: { id: string; location: 'sidebar' | 'tab' } | null) => void;
  editingFileName: string;
  setEditingFileName: React.Dispatch<React.SetStateAction<string>>;
  startRenaming: (file: FileType, e: React.MouseEvent, location: 'sidebar' | 'tab') => void;
  submitRename: () => void;
  setContextMenu: (val: { fileId: string; x: number; y: number } | null) => void;
  isRenamingRef: React.MutableRefObject<boolean>;
  setHoveredUrl: (url: string | null) => void;
}

export function Sidebar({
  isMobile,
  isSidebarOpen,
  setIsSidebarOpen,
  editingFileId,
  setEditingFileId,
  editingFileName,
  setEditingFileName,
  startRenaming,
  submitRename,
  setContextMenu,
  isRenamingRef,
  setHoveredUrl
}: SidebarProps) {
  const { searchQuery, setSearchQuery, filteredFiles, handleCreateFile, activeFileId, openFile } = useFile();

  return (
    <AnimatePresence>
      {isSidebarOpen && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-md lg:hidden"
        />
      )}

      {(isSidebarOpen || !isMobile) && (
        <motion.aside
          initial={isMobile ? { x: '-100%' } : false}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`flex flex-col border-r border-slate-100 bg-white/80 backdrop-blur-3xl dark:border-slate-800 dark:bg-slate-950/80 lg:bg-white/40 overflow-hidden shadow-2xl lg:shadow-none ${
            isMobile ? 'fixed inset-y-0 left-0 z-[100] w-[285px]' : 'relative'
          }`}
          style={{
            width: !isMobile ? (isSidebarOpen ? '280px' : '0px') : undefined,
            transition: !isMobile ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
          }}
        >
          <div className="flex flex-col h-full w-[285px] lg:w-[280px]">
          <div className="flex flex-col p-4 h-full overflow-hidden">
            <div className="flex flex-col gap-6 flex-shrink-0">
              <div className="flex items-center gap-1 px-3 mt-3 mb-2">
                {isMobile && (
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all"
                  >
                    <PanelLeftClose size={18} />
                  </button>
                )}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/80 dark:text-slate-500 transition-colors peer-focus:text-google-blue" size={16} />
                  <input
                    className="peer h-9 w-full rounded-lg border border-transparent bg-slate-100 dark:bg-slate-900 pl-9 pr-4 text-[13px] font-medium text-slate-800 placeholder-slate-500 focus:border-google-blue focus:bg-white focus:outline-none dark:text-slate-200 dark:placeholder-slate-400 dark:focus:border-google-blue dark:focus:bg-slate-950 transition-all"
                    placeholder="Search notes..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Workspace</p>
                {filteredFiles.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tooltip title="New File" position="top">
                      <button
                        onClick={handleCreateFile}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-google-blue shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700"
                      >
                        <Plus size={16} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            <nav 
              className="space-y-1 flex-1 overflow-y-auto no-scrollbar mb-24 pt-4 pb-8 relative z-10"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 32px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 16px, black calc(100% - 32px), transparent 100%)'
              }}
            >
              {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    className="group relative"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY });
                    }}
                  >
                    {editingFileId?.id === file.id && editingFileId.location === 'sidebar' ? (
                      <div className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium bg-google-blue text-white shadow-md shadow-google-blue/20">
                        <FileText size={18} />
                        <input
                          autoFocus
                          className="flex-1 bg-transparent outline-none border-b border-white/50 text-white min-w-0"
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
                        />
                      </div>
                    ) : (
                      <div
                        className={`group/item relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                          activeFileId === file.id
                            ? 'bg-google-blue text-white shadow-md shadow-google-blue/20'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                        onClick={() => {
                          openFile(file.id);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        onMouseEnter={() => setHoveredUrl(`${window.location.origin}/file/${file.id}`)}
                        onMouseLeave={() => setHoveredUrl(null)}
                      >
                        <FileText size={18} />
                        <span className="truncate flex-1 text-left">{file.name.replace(/\.(txt|md)$/i, '')}</span>
                        
                        <div className={`flex-shrink-0 transition-opacity duration-200 ${activeFileId === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover/item:opacity-100'}`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setContextMenu({ fileId: file.id, x: rect.left, y: rect.bottom + 5 });
                            }}
                            className={`p-1 rounded-md transition-colors ${
                              activeFileId === file.id 
                                ? 'hover:bg-white/20 text-white' 
                                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredFiles.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50 text-slate-400 mb-3 grayscale opacity-60">
                      <Plus size={20} />
                    </div>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">No notes yet</p>
                    <button 
                      onClick={handleCreateFile}
                      className="mt-3 text-[11px] font-bold text-google-blue hover:underline opacity-80"
                    >
                      Create your first note
                    </button>
                  </div>
                )}
              </nav>
          </div>
        </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
