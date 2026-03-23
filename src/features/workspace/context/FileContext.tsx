import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { db, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, handleFirestoreError, OperationType } from 'config/firebase';
import { useAuth } from 'features/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Descendant } from 'slate';
import { serializeMarkdown } from 'features/editor';

export interface File {
  id: string;
  userId: string;
  name: string;
  content: string | Descendant[];
  type: 'txt' | 'md';
  lastSaved: number;
  createdAt: number;
}

interface FileContextType {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  openFileIds: string[];
  setOpenFileIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeFileId: string;
  setActiveFileId: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  activeFile: File | undefined;
  openFiles: File[];
  filteredFiles: File[];
  isSaving: boolean;
  isLoading: boolean;
  lastSavedStatus: 'idle' | 'saving' | 'saved' | 'error';
  handleCreateFile: () => Promise<void>;
  executeDelete: (id: string) => Promise<void>;
  handleSave: (contentOverride?: string | Descendant[], fileIdOverride?: string) => Promise<void>;
  closeTab: (id: string, e: React.MouseEvent) => void;
  openFile: (id: string) => void;
  handleRename: (id: string, newName: string) => Promise<void>;
  downloadFile: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [files, setFiles] = useState<File[]>([]);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedStatus, setLastSavedStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Route -> State Sync
  useEffect(() => {
    if (!user) return;
    const match = location.pathname.match(/^\/file\/(.+)$/);
    if (match) {
      const id = match[1];
      if (id !== activeFileId) {
        setOpenFileIds(prev => prev.includes(id) ? prev : [...prev, id]);
        setActiveFileId(id);
      }
    } else if (location.pathname === '/') {
      if (activeFileId !== '' || openFileIds.length > 0) {
        setActiveFileId('');
        setOpenFileIds([]);
      }
    }
  }, [location.pathname, user]);

  // Firestore Sync
  useEffect(() => {
    if (!user || !isAuthReady) {
      setFiles([]);
      setOpenFileIds([]);
      setActiveFileId('');
      return;
    }

    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedFiles = snapshot.docs
        .map(doc => doc.data() as File)
        .sort((a, b) => b.createdAt - a.createdAt);

      setFiles(prev => {
        const isDifferent = JSON.stringify(prev) !== JSON.stringify(fetchedFiles);
        return isDifferent ? fetchedFiles : prev;
      });
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);
  const openFiles = useMemo(() => files.filter(f => openFileIds.includes(f.id)), [files, openFileIds]);
  const filteredFiles = useMemo(() => files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())), [files, searchQuery]);

  const handleCreateFile = async () => {
    if (!user) return;

    const untitledCount = files.filter(f => f.name.startsWith('Untitled Note')).length;
    const name = `Untitled Note ${untitledCount + 1}.txt`;
    const id = Math.random().toString(36).substr(2, 9);

    const newFile: File = {
      id,
      userId: user.uid,
      name,
      content: '',
      type: 'txt',
      lastSaved: Date.now(),
      createdAt: Date.now()
    };

    try {
      // Optimistic update
      setFiles(prev => [newFile, ...prev]);
      setOpenFileIds(prev => prev.includes(id) ? prev : [...prev, id]);
      setActiveFileId(id);
      navigate(`/file/${id}`);

      await setDoc(doc(db, 'notes', id), newFile);
      showToast("New file created!", "success");
    } catch (error) {
      // Rollback on error
      setFiles(prev => prev.filter(f => f.id !== id));
      setOpenFileIds(prev => prev.filter(oid => oid !== id));
      setActiveFileId(prev => prev === id ? '' : prev);
      navigate('/');
      showToast("Failed to create file. Check your connection.", "error");
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
      const remainingIds = openFileIds.filter(openId => openId !== id);
      setOpenFileIds(remainingIds);
      
      if (activeFileId === id) {
        const nextId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : '';
        if (nextId) {
          navigate(`/file/${nextId}`);
        } else {
          setActiveFileId('');
          navigate('/');
        }
      }
      showToast("File deleted successfully", "success");
    } catch (error) {
      showToast("Failed to delete file.", "error");
    }
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenIds = openFileIds.filter(openId => openId !== id);
    setOpenFileIds(newOpenIds);
    if (activeFileId === id && newOpenIds.length > 0) {
      navigate(`/file/${newOpenIds[0]}`);
    } else if (newOpenIds.length === 0) {
      navigate('/');
    }
  };

  const openFile = (id: string) => {
    navigate(`/file/${id}`);
  };

  const handleRename = async (id: string, newName: string) => {
    try {
      await setDoc(doc(db, 'notes', id), {
        name: newName,
        lastSaved: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${id}`);
    }
  };

  const handleSave = async (contentOverride?: string | Descendant[], fileIdOverride?: string) => {
    const targetFileId = fileIdOverride || activeFileId;
    const targetFile = files.find(f => f.id === targetFileId);
    if (!targetFile || !user) return;
    
    setIsSaving(true);
    setLastSavedStatus('saving');
    try {
      let contentToSave = contentOverride !== undefined ? contentOverride : targetFile.content;
      if (typeof contentToSave !== 'string') {
        contentToSave = serializeMarkdown(contentToSave as Descendant[]);
      }

      const updatedFile = { ...targetFile, content: contentToSave, lastSaved: Date.now() };
      await setDoc(doc(db, 'notes', targetFileId), updatedFile);
      setLastSavedStatus('saved');
      setTimeout(() => setLastSavedStatus('idle'), 3000);
    } catch (error) {
      setLastSavedStatus('error');
      console.error("Save failed:", error);
      showToast("Failed to save changes. Please check your connection.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!activeFile || !user) return;
    
    // Only auto-save if the file content is currently deeply parsed (which happens immediately when the user types)
    if (typeof activeFile.content === 'string') return;

    const timer = setTimeout(() => {
      handleSave();
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeFile?.content, user]);

  const downloadFile = async () => {
    if (!activeFile) {
      showToast("No active file to download", "error");
      return;
    }

    try {
      const contentStr = typeof activeFile.content === 'string'
        ? activeFile.content
        : serializeMarkdown(activeFile.content);

      if (!contentStr && activeFile.content !== '') {
        showToast("Failed to process file content for download", "error");
        return;
      }

      let fileName = activeFile.name;
      if (!fileName.endsWith('.md') && !fileName.endsWith('.txt')) {
        fileName += activeFile.type === 'md' ? '.md' : '.txt';
      }

      // Check if the modern File System Access API is supported
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'Markdown File',
                accept: { 'text/markdown': ['.md'] },
              },
              {
                description: 'Text File',
                accept: { 'text/plain': ['.txt'] },
              },
            ],
          });
          
          const writable = await handle.createWritable();
          await writable.write(contentStr);
          await writable.close();
          showToast(`Saved as ${handle.name}`, "success");
          return;
        } catch (err: any) {
          // If the user cancelled, we don't need to do anything or show an error
          if (err.name === 'AbortError') return;
          console.error("Save system failed, falling back:", err);
        }
      }

      // Fallback for browsers without showSaveFilePicker (or if it failed)
      const blob = new Blob([contentStr], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      showToast(`Downloading ${fileName}...`, "success");
    } catch (error) {
      console.error("Download failed:", error);
      showToast("Download failed. Please try again.", "error");
    }
  };

  return (
    <FileContext.Provider value={{
      files, setFiles, openFileIds, setOpenFileIds, activeFileId, setActiveFileId,
      searchQuery, setSearchQuery, activeFile, openFiles, filteredFiles,
      isSaving, isLoading, lastSavedStatus, handleCreateFile, executeDelete, handleSave,
      closeTab, openFile, handleRename, downloadFile, showToast, toasts
    }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFile() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context;
}
