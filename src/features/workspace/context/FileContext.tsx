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
  lastSavedStatus: 'idle' | 'saving' | 'saved' | 'error';
  handleCreateFile: () => Promise<void>;
  executeDelete: (id: string) => Promise<void>;
  handleSave: () => Promise<void>;
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
      if (activeFileId !== '') {
        setActiveFileId('');
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

      if (fetchedFiles.length > 0 && openFileIds.length === 0) {
        setOpenFileIds([fetchedFiles[0].id]);
        setActiveFileId(fetchedFiles[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => unsubscribe();
  }, [user, isAuthReady, openFileIds.length]);

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
      await setDoc(doc(db, 'notes', id), newFile);
      openFile(id);
      showToast("New file created!", "success");
    } catch (error) {
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

  const handleSave = async () => {
    if (!activeFile || !user) return;
    setIsSaving(true);
    setLastSavedStatus('saving');
    try {
      let contentToSave = activeFile.content;
      if (typeof contentToSave !== 'string') {
        contentToSave = serializeMarkdown(contentToSave as Descendant[]);
      }

      const updatedFile = { ...activeFile, content: contentToSave, lastSaved: Date.now() };
      await setDoc(doc(db, 'notes', activeFile.id), updatedFile);
      setLastSavedStatus('saved');
      setTimeout(() => setLastSavedStatus('idle'), 3000);
    } catch (error) {
      setLastSavedStatus('error');
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

  const downloadFile = () => {
    if (!activeFile) {
      showToast("No active file to download", "error");
      return;
    }

    try {
      // Ensure we have the latest content serialized
      const contentStr = typeof activeFile.content === 'string'
        ? activeFile.content
        : serializeMarkdown(activeFile.content);

      if (!contentStr && activeFile.content !== '') {
        showToast("Failed to process file content for download", "error");
        return;
      }

      const blob = new Blob([contentStr], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Use the actual file name, ensuring it has the correct extension
      let fileName = activeFile.name;
      if (!fileName.endsWith('.md') && !fileName.endsWith('.txt')) {
        fileName += activeFile.type === 'md' ? '.md' : '.txt';
      }

      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
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
      isSaving, lastSavedStatus, handleCreateFile, executeDelete, handleSave,
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
