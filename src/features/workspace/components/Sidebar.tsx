import React from 'react';
import { Search, Plus, FileText } from 'lucide-react';
import { useFile, File as FileType } from '../context/FileContext';
import { Tooltip } from 'components/Tooltip';

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
  isRenamingRef
}: SidebarProps) {
  const { searchQuery, setSearchQuery, filteredFiles, handleCreateFile, activeFileId, openFile } = useFile();

  return (
    <>
      {isSidebarOpen && isMobile && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className="flex flex-col border-r border-slate-100 bg-white/80 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/80 lg:bg-white/40 overflow-hidden shadow-2xl lg:shadow-none"
        style={{
          width: isSidebarOpen ? (isMobile ? '85%' : '280px') : (isMobile ? '0px' : '0px'),
          minWidth: isSidebarOpen ? undefined : '0px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: isMobile ? 'fixed' : 'relative',
          ...(isMobile ? { inset: '0 auto 0 0', zIndex: 40 } : {})
        }}
      >
        <div style={{ width: isMobile ? '85vw' : '280px', maxWidth: '320px' }} className="flex flex-col h-full">
          <div className="flex flex-col p-4 h-full">
            <div className="flex flex-col gap-6">
              <div className="relative w-full px-3 mt-3 mb-2">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400/80 dark:text-slate-500 transition-colors peer-focus:text-google-blue" size={16} />
                <input
                  className="peer h-9 w-full rounded-lg border border-transparent bg-slate-100 dark:bg-slate-900 pl-10 pr-4 text-[13px] font-medium text-slate-800 placeholder-slate-500 focus:border-google-blue focus:bg-white focus:outline-none dark:text-slate-200 dark:placeholder-slate-400 dark:focus:border-google-blue dark:focus:bg-slate-950 transition-all"
                  placeholder="Search notes..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between px-2 pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Workspace</p>
                <div className="flex items-center gap-1">
                  <Tooltip content="New File" position="top">
                    <button
                      onClick={handleCreateFile}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-google-blue shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      <Plus size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
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
                      <button
                        onClick={() => {
                          openFile(file.id);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        onDoubleClick={(e) => startRenaming(file, e, 'sidebar')}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          activeFileId === file.id
                            ? 'bg-google-blue text-white shadow-md shadow-google-blue/20'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FileText size={18} />
                        <span className="truncate flex-1 text-left">{file.name.replace(/\.(txt|md)$/i, '')}</span>
                      </button>
                    )}
                  </div>
                ))}
                {filteredFiles.length === 0 && (
                  <div className="px-3 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Plus size={20} />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No notes yet</p>
                    <button
                      onClick={handleCreateFile}
                      className="mt-3 text-xs font-bold text-google-blue hover:underline"
                    >
                      Create your first note
                    </button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
