import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFile } from '../context/FileContext';
import { useTheme } from 'features/theme';
import { TopNav } from '../components/TopNav';
import { Sidebar } from '../components/Sidebar';
import { TabBar } from '../components/TabBar';
import { SlateEditor } from 'features/editor';
import { FileText, Plus, X, History, Sparkles } from 'lucide-react';
import { Branding } from 'components/Branding';
import { motion, AnimatePresence } from 'motion/react';
import { serializeMarkdown } from 'features/editor';
import { Descendant } from 'slate';

export function WorkspaceLayout() {
  const { 
    files, setFiles, activeFileId, activeFile, 
    handleSave, showToast, toasts, downloadFile, executeDelete, lastSavedStatus
  } = useFile();
  const { formattingSettings, updateFormattingSettings, editorFontSize } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [editingFileId, setEditingFileId] = useState<{ id: string; location: 'sidebar' | 'tab' } | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ fileId: string; x: number; y: number } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isRenamingRef = useRef(false);

  // Responsive Sidebar Toggle and Mobile Detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Resizing Logic
  const startResizing = () => setIsResizing(true);
  const stopResizing = () => setIsResizing(false);
  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  // Context Menu Close
  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', close);
      window.addEventListener('contextmenu', close);
      window.addEventListener('scroll', close, true);
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, handleSave]);

  const stats = useMemo(() => {
    const text = typeof activeFile?.content === 'string'
      ? activeFile.content
      : serializeMarkdown(activeFile?.content || []);
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    return { words, chars };
  }, [activeFile]);

  const { handleRename } = useFile();

  const handleRenameWrapper = async () => {
    if (!editingFileId || !editingFileName.trim()) {
      setEditingFileId(null);
      isRenamingRef.current = false;
      return;
    }
    await handleRename(editingFileId.id, editingFileName);
    setEditingFileId(null);
    isRenamingRef.current = false;
  };

  const startRenaming = (file: any, e: React.MouseEvent, location: 'sidebar' | 'tab') => {
    e.stopPropagation();
    isRenamingRef.current = true;
    setEditingFileId({ id: file.id, location });
    setEditingFileName(file.name);
  };

  return (
    <div className="flex h-screen w-full flex-col font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Atmospheric Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20 dark:opacity-40">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-google-blue/20 blur-[120px]"></div>
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-google-green/10 blur-[120px]"></div>
        <div className="absolute left-[30%] top-[20%] h-[30%] w-[30%] rounded-full bg-google-red/10 blur-[120px]"></div>
        <div className="absolute right-[20%] top-[40%] h-[25%] w-[25%] rounded-full bg-google-yellow/10 blur-[120px]"></div>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Note?</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              This action cannot be undone. Are you sure you want to delete this note?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <TopNav isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isMobile={isMobile}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          editingFileId={editingFileId}
          setEditingFileId={setEditingFileId}
          editingFileName={editingFileName}
          setEditingFileName={setEditingFileName}
          startRenaming={startRenaming}
          submitRename={handleRenameWrapper}
          setContextMenu={setContextMenu}
          isRenamingRef={isRenamingRef}
        />

        <main className="relative flex flex-1 flex-col bg-transparent">
          <TabBar 
            editingFileId={editingFileId}
            setEditingFileId={setEditingFileId}
            editingFileName={editingFileName}
            setEditingFileName={setEditingFileName}
            startRenaming={startRenaming}
            submitRename={handleRenameWrapper}
            isRenamingRef={isRenamingRef}
          />

          <div className="flex flex-1 overflow-hidden relative bg-white/20 dark:bg-slate-950/20">
            {!activeFile ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-8">
                <div className="mb-4 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
                  <FileText size={48} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No file active</h3>
                <p className="text-sm text-slate-400">Select a file from the sidebar or create a new one.</p>
              </div>
            ) : (
              <div className="flex h-full w-full">
                <SlateEditor
                  key={activeFile.id}
                  initialContent={activeFile.content}
                  onChange={(newContent: Descendant[]) => {
                    setFiles(prev => prev.map(f =>
                      f.id === activeFile.id ? { ...f, content: newContent } : f
                    ));
                    handleSave();
                  }}
                  fontSize={editorFontSize}
                  activeFileId={activeFile.id}
                  showToast={showToast}
                  formattingSettings={formattingSettings}
                  onSettingsChange={updateFormattingSettings}
                  onDownload={downloadFile}
                  onShare={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('Link copied to clipboard!', 'success');
                  }}
                />
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between border-t border-slate-100 bg-white/40 px-3 md:px-6 py-2 text-[10px] md:text-[11px] font-medium text-slate-400 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 md:gap-4 font-mono text-[9px] md:text-[10px] tracking-wider uppercase">
              <span className="opacity-60 text-slate-500 dark:text-slate-400">CHARACTER:</span>
              <span className="text-slate-900 dark:text-white font-bold">{stats.chars.toLocaleString()}</span>
              <span className="mx-0.5 md:mx-1 h-2 w-px bg-slate-200 dark:bg-slate-800"></span>
              <span className="opacity-60 text-slate-500 dark:text-slate-400">WORD:</span>
              <span className="text-slate-900 dark:text-white font-bold">{stats.words}</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  lastSavedStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
                  lastSavedStatus === 'saved' ? 'bg-green-500' :
                  lastSavedStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'
                }`}></span>
                <span className="hidden sm:inline">
                  {lastSavedStatus === 'saving' ? 'SAVING...' :
                   lastSavedStatus === 'saved' ? 'SAVED' :
                   lastSavedStatus === 'error' ? 'ERROR' : 'SYNCED'}
                </span>
              </span>

              <span className="flex items-center gap-1.5 opacity-80 font-mono text-[9px] md:text-[10px]">
                <History size={10} className="md:w-3 md:h-3" />
                <span className="hidden xs:inline">SYNC:</span>
                {activeFile?.lastSaved
                  ? `${new Date(activeFile.lastSaved).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(activeFile.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : '—'}
              </span>
              <span className="hidden sm:inline mx-1 md:mx-2 h-3 w-px bg-slate-200 dark:bg-slate-800"></span>
              <span className="hidden sm:inline flex items-center gap-1 font-mono text-[9px] md:text-[10px]">
                <span className="opacity-60">CREATED:</span>
                {activeFile?.createdAt
                  ? `${new Date(activeFile.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(activeFile.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : '—'}
              </span>
            </div>
          </footer>
        </main>
      </div>

      <Branding />

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
                toast.type === 'error'
                  ? 'border-red-100 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/80 dark:text-red-400'
                  : toast.type === 'success'
                  ? 'border-green-100 bg-green-50 text-green-600 dark:border-green-900/50 dark:bg-green-950/80 dark:text-green-400'
                  : 'border-slate-100 bg-white/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400'
              }`}
            >
              {toast.type === 'error' ? <X size={16} /> : toast.type === 'success' ? <FileText size={16} /> : <Sparkles size={16} />}
              <span className="text-xs font-bold uppercase tracking-wide">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
