import * as React from 'react';
import { useState, useMemo, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { 
  Search, 
  FileText, 
  Cloud, 
  Download, 
  MoreVertical, 
  Plus, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  List, 
  CheckSquare, 
  Sparkles, 
  Save,
  History,
  Type,
  Eye,
  Edit3,
  Trash2,
  Loader2,
  LogIn,
  LogOut,
  User as UserIcon,
  Moon,
  Sun,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Code,
  AlignLeft,
  Quote,
  Terminal,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Search as SearchIcon,
  Replace,
  Settings,
  Maximize2,
  Minimize2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { correctGrammar } from './services/geminiService';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  type User,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  handleFirestoreError,
  OperationType
} from './firebase';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let isQuotaError = false;
      
      try {
        const errorData = JSON.parse(this.state.error?.message || "{}");
        if (errorData.error?.includes("Quota exceeded")) {
          isQuotaError = true;
          errorMessage = "Firestore quota exceeded. Please try again tomorrow.";
        } else if (errorData.error?.includes("Missing or insufficient permissions")) {
          errorMessage = "Permission denied. Please check if you are logged in correctly.";
        } else if (errorData.error?.includes("The query requires an index")) {
          errorMessage = "This query requires a Firestore index. Please wait for the developer to create it.";
        } else {
          errorMessage = errorData.error || this.state.error?.message || errorMessage;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light p-6 text-center dark:bg-background-dark">
          <div className="max-w-md space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isQuotaError ? "Quota Exceeded" : "Application Error"}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-google-blue px-6 py-2 font-medium text-white hover:bg-google-blue/90 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface File {
  id: string;
  userId: string;
  name: string;
  content: string;
  type: 'txt' | 'md';
  lastSaved: number;
  createdAt: number;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedStatus, setLastSavedStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const isRenamingRef = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const startRenaming = (file: File, e: React.MouseEvent) => {
    e.stopPropagation();
    isRenamingRef.current = true;
    setEditingFileId(file.id);
    setEditingFileName(file.name);
  };

  const handleRename = async () => {
    if (!editingFileId || !editingFileName.trim()) {
      setEditingFileId(null);
      isRenamingRef.current = false;
      return;
    }
    
    try {
      await setDoc(doc(db, 'notes', editingFileId), { 
        name: editingFileName,
        lastSaved: Date.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${editingFileId}`);
    } finally {
      setEditingFileId(null);
      isRenamingRef.current = false;
    }
  };

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
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Resizing Logic
  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

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

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

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
        .sort((a, b) => b.lastSaved - a.lastSaved);
      
      setFiles(prev => {
        // Only update if data actually changed to prevent cursor resets
        const isDifferent = JSON.stringify(prev) !== JSON.stringify(fetchedFiles);
        return isDifferent ? fetchedFiles : prev;
      });
      
      // Auto-open the most recent file if none are open
      if (fetchedFiles.length > 0 && openFileIds.length === 0) {
        setOpenFileIds([fetchedFiles[0].id]);
        setActiveFileId(fetchedFiles[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const activeFile = useMemo(() => 
    files.find(f => f.id === activeFileId), 
  [files, activeFileId]);

  const openFiles = useMemo(() => 
    files.filter(f => openFileIds.includes(f.id)), 
  [files, openFileIds]);

  const filteredFiles = useMemo(() => 
    files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())), 
  [files, searchQuery]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => auth.signOut();

  const handleContentChange = React.useCallback((content: string) => {
    setActiveFileId(currentId => {
      setFiles(prev => prev.map(f => f.id === currentId ? { ...f, content } : f));
      return currentId;
    });
  }, []);

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenIds = openFileIds.filter(openId => openId !== id);
    setOpenFileIds(newOpenIds);
    if (activeFileId === id && newOpenIds.length > 0) {
      setActiveFileId(newOpenIds[0]);
    } else if (newOpenIds.length === 0) {
      setActiveFileId('');
    }
  };

  const openFile = (id: string) => {
    if (!openFileIds.includes(id)) {
      setOpenFileIds([...openFileIds, id]);
    }
    setActiveFileId(id);
    if (isMobile) setIsSidebarOpen(false);
    
    // Focus editor after a short delay to allow for render, but only if not renaming
    setTimeout(() => {
      if (!isRenamingRef.current) {
        editorRef.current?.focus();
      }
    }, 150);
  };

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

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    
    try {
      await deleteDoc(doc(db, 'notes', confirmDeleteId));
      setOpenFileIds(prev => prev.filter(openId => openId !== confirmDeleteId));
      if (activeFileId === confirmDeleteId) setActiveFileId('');
      showToast("File deleted successfully", "success");
    } catch (error) {
      showToast("Failed to delete file.", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleGrammarFix = async () => {
    if (!activeFile || isCorrecting) return;
    setIsCorrecting(true);
    try {
      const corrected = await correctGrammar(activeFile.content);
      handleContentChange(corrected);
      showToast("Grammar corrected!", "success");
    } catch (error) {
      showToast("Grammar check failed.", "error");
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSave = async () => {
    if (!activeFile || !user) return;
    setIsSaving(true);
    setLastSavedStatus('saving');
    try {
      const updatedFile = { ...activeFile, lastSaved: Date.now() };
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
    
    const timer = setTimeout(() => {
      handleSave();
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(timer);
  }, [activeFile?.content]);

  const downloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!editorRef.current || !activeFile) return;
    
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    handleContentChange(newText);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleFormatContent = () => {
    if (!activeFile) return;
    
    let formatted = activeFile.content
      // Remove trailing whitespace from each line
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      // Remove excessive blank lines (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Ensure single blank line between paragraphs
      .trim();
      
    handleContentChange(formatted);
  };

  const handleFindReplace = (type: 'find' | 'replace' | 'replaceAll') => {
    if (!activeFile || !findText) return;
    
    let content = activeFile.content;
    if (type === 'find') {
      // Just highlight/scroll to next occurrence (simplified for now)
      const index = content.indexOf(findText);
      if (index !== -1 && editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(index, index + findText.length);
      }
    } else if (type === 'replace') {
      const index = content.indexOf(findText);
      if (index !== -1) {
        const newContent = content.substring(0, index) + replaceText + content.substring(index + findText.length);
        handleContentChange(newContent);
      }
    } else if (type === 'replaceAll') {
      const newContent = content.split(findText).join(replaceText);
      handleContentChange(newContent);
    }
  };

  const stats = useMemo(() => {
    const text = activeFile?.content || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    return { words, chars };
  }, [activeFile]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsPreviewMode(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsSplitView(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, user]);

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background-light p-6 dark:bg-background-dark relative overflow-hidden">
        {/* Theme Toggle on Landing Page - Fixed Top Right */}
        <div className="fixed top-2 right-2 md:top-6 md:right-6 z-50">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 text-slate-600 shadow-xl backdrop-blur-md hover:bg-white dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200 border border-slate-100 dark:border-slate-800"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Editorial Background */}
        <div className="absolute inset-0 z-0 opacity-10 dark:opacity-20">
          <h1 className="absolute -left-10 sm:-left-20 top-0 text-[40vw] sm:text-[30vw] font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
            LASUN
          </h1>
          <h1 className="absolute -right-10 sm:-right-20 bottom-0 text-[40vw] sm:text-[30vw] font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
            FRY
          </h1>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-10 text-center">
          <div className="flex h-32 w-32 items-center justify-center -mb-4">
            <BrandIcon size={180} />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
              Lasunfry
            </h1>
            <p className="max-w-md text-lg font-medium text-slate-500 dark:text-slate-400">
              A modern, clean markdown editor and note-taking application for your masterpieces.
            </p>
          </div>
          <button 
            onClick={handleLogin}
            className="group flex items-center gap-4 rounded-xl bg-white px-10 py-4 text-lg font-bold text-slate-700 shadow-xl transition-all hover:shadow-2xl hover:scale-105 active:scale-95 border border-slate-100 dark:bg-slate-800 dark:text-white dark:border-slate-700"
          >
            <div className="flex h-6 w-6 items-center justify-center">
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            Sign in with Google
          </button>
        </div>

        {/* Fixed Branding on Bottom Left - Landing Page */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-1">
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase opacity-60">
            © All Rights Reserved by Lasunfry
          </p>
          <p className="text-[9px] font-medium text-slate-400 opacity-50">
            Designed and Developed by Coddynet infotech
          </p>
        </div>
      </div>
    );
  }

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
                onClick={executeDelete}
                className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-100 bg-white/40 px-3 md:px-6 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 sticky top-0 z-40">
        <div className="flex items-center gap-2 md:gap-6">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveFileId('')}>
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BrandIcon size={32} className="md:w-10 md:h-10" />
              </div>
              <h2 className="text-base md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase truncate max-w-[100px] sm:max-w-none">Lasunfry</h2>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-4">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
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
            <button 
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 dark:hover:bg-red-950/30"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && isMobile && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Sidebar */}
        {isSidebarOpen && (
          <aside 
            className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-100 bg-white/80 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/80 lg:relative lg:inset-auto lg:z-0 lg:bg-white/40 overflow-hidden shadow-2xl lg:shadow-none"
            style={{ width: !isMobile ? sidebarWidth : '85%', maxWidth: '320px' }}
          >
            <div className="flex w-70 flex-col p-4">
              <div className="flex flex-col gap-6">
                <div className="relative w-full px-2 mt-2">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="h-10 w-full rounded-xl border-none bg-white/50 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-google-blue/30 dark:bg-slate-900/50 dark:text-white backdrop-blur-sm transition-all" 
                    placeholder="Search notes..." 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between px-2 pt-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Workspace</p>
                  <button 
                    onClick={handleCreateFile}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-google-blue shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                    title="New File"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                  {filteredFiles.map(file => (
                    <div key={file.id} className="group relative">
                      <button
                        onClick={() => openFile(file.id)}
                        onDoubleClick={(e) => startRenaming(file, e)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          activeFileId === file.id 
                            ? 'bg-google-blue text-white shadow-md shadow-google-blue/20' 
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FileText size={18} />
                        {editingFileId === file.id ? (
                          <input
                            autoFocus
                            className="flex-1 bg-transparent outline-none border-b border-white/50 text-white"
                            value={editingFileName}
                            onChange={(e) => setEditingFileName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename();
                              if (e.key === 'Escape') {
                                setEditingFileId(null);
                                isRenamingRef.current = false;
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate flex-1 text-left">{file.name}</span>
                        )}
                      </button>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => startRenaming(file, e)}
                          className="text-slate-400 hover:text-google-blue transition-all"
                          title="Rename"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); downloadFile(); }}
                          className="text-slate-400 hover:text-google-blue transition-all"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={(e) => deleteFile(file.id, e)}
                          className="text-slate-400 hover:text-red-500 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
                        className="mt-3 text-xs font-bold text-primary hover:underline"
                      >
                        Create your first note
                      </button>
                    </div>
                  )}
                </nav>
              </div>
            </div>
          </aside>
        )}

        {/* Resizer */}
        <div 
          onMouseDown={startResizing}
          className={`hidden lg:flex group relative w-1 cursor-col-resize items-center justify-center bg-slate-200/50 transition-colors hover:bg-google-blue dark:bg-slate-800/50 ${isResizing ? 'bg-google-blue' : ''}`}
        >
          <div className="h-12 w-1 rounded-full bg-slate-300/50 group-hover:bg-white/80 dark:bg-slate-700/50"></div>
        </div>

        {/* Main Content Area */}
        <main className="relative flex flex-1 flex-col bg-transparent">
          {/* File Tabs */}
          <div className="flex border-b border-slate-100 bg-white/40 px-2 md:px-4 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 overflow-x-auto no-scrollbar scroll-smooth">
            <div className="flex h-12 items-center gap-1 min-w-max">
              {openFiles.map(file => (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  onDoubleClick={(e) => startRenaming(file, e)}
                  className={`flex h-full items-center gap-2 border-b-2 px-4 text-xs font-bold tracking-wider uppercase cursor-pointer transition-all duration-300 ${
                    activeFileId === file.id
                      ? 'border-google-blue text-google-blue'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  <Type size={14} />
                  {editingFileId === file.id ? (
                    <input
                      autoFocus
                      className="bg-transparent outline-none border-b border-google-blue text-google-blue"
                      value={editingFileName}
                      onChange={(e) => setEditingFileName(e.target.value)}
                      onBlur={handleRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') {
                          setEditingFileId(null);
                          isRenamingRef.current = false;
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    file.name
                  )}
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
              <button 
                onClick={handleCreateFile}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Editor Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white/40 px-2 md:px-4 py-1.5 md:py-2 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/40 overflow-x-auto no-scrollbar scroll-smooth">
            <div className="flex items-center gap-0.5 md:gap-1 min-w-max">
              <ToolbarButton icon={<Bold size={16} />} title="Bold" onClick={() => insertMarkdown('**', '**')} />
              <ToolbarButton icon={<Italic size={16} />} title="Italic" onClick={() => insertMarkdown('_', '_')} />
              <ToolbarButton icon={<Underline size={16} />} title="Underline" onClick={() => insertMarkdown('<u>', '</u>')} />
              <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
              <ToolbarButton icon={<CheckSquare size={16} />} title="Checkbox List" onClick={() => insertMarkdown('\n- [ ] ')} />
              <ToolbarButton icon={<List size={16} />} title="Toggle List" onClick={() => insertMarkdown('\n<details>\n<summary>Toggle Title</summary>\n\n- Item 1\n- Item 2\n\n</details>\n')} />
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 ml-4 min-w-max">
              <button 
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`flex items-center gap-1.5 rounded-lg px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${
                  isPreviewMode 
                    ? 'bg-google-blue text-white shadow-md shadow-google-blue/20' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isPreviewMode ? <Edit3 size={14} /> : <Eye size={14} />}
                <span className="hidden sm:inline">{isPreviewMode ? 'Edit' : 'Preview'}</span>
              </button>
              
              {!isMobile && (
                <button 
                  onClick={() => setIsSplitView(!isSplitView)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${
                    isSplitView 
                      ? 'bg-google-blue text-white shadow-md shadow-google-blue/20' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <Maximize2 size={14} />
                  <span className="hidden sm:inline">Split</span>
                </button>
              )}
            </div>
          </div>

          {/* Find and Replace Panel */}
          {isFindReplaceOpen && (
            <div className="overflow-hidden border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Find..." 
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-google-blue dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button onClick={() => handleFindReplace('find')} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">Find Next</button>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Replace with..." 
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-google-blue dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button onClick={() => handleFindReplace('replace')} className="rounded-lg bg-google-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-google-blue/90">Replace</button>
                  <button onClick={() => handleFindReplace('replaceAll')} className="rounded-lg bg-google-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-google-blue/90">Replace All</button>
                </div>
                <button onClick={() => setIsFindReplaceOpen(false)} className="ml-auto text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
            </div>
          )}

          {/* Main Editor Area */}
          <div className="flex flex-1 overflow-hidden relative bg-white/20 dark:bg-slate-950/20">
            {/* Vertical Branding */}
            {/* Watermark Removed */}

            {!activeFile ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-center p-8">
                <div className="mb-4 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
                  <FileText size={48} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No file active</h3>
                <p className="text-sm text-slate-400">Select a file from the sidebar or create a new one.</p>
              </div>
            ) : (
              <div className={`flex h-full w-full ${isSplitView && !isMobile ? 'flex-row' : 'flex-col'}`}>
                {(!isPreviewMode || (isSplitView && !isMobile)) && (
                  <NoteEditor 
                    initialContent={activeFile.content}
                    onChange={handleContentChange}
                    fontSize={editorFontSize}
                    isSplitView={isSplitView && !isMobile}
                  />
                )}
                {(isPreviewMode || (isSplitView && !isMobile)) && (
                  <div className={`flex flex-col overflow-y-auto p-4 md:p-[15px] ${isSplitView && !isMobile ? 'w-1/2' : 'w-full'} relative group/preview`}>
                    <div className="absolute right-6 top-6 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(activeFile.content);
                          showToast("Copied to clipboard!", "success");
                        }}
                        className="flex h-8 items-center gap-2 rounded-lg bg-white/80 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-md backdrop-blur-md hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-700"
                        title="Copy Content"
                      >
                        <Save size={12} />
                        Copy
                      </button>
                    </div>
                    <div className="prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeFile.content || '*No content to preview*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Floating Bottom Actions Removed */}

          {/* Footer Info */}
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
                <span className="hidden xs:inline">SYNC:</span> {activeFile?.lastSaved ? new Date(activeFile.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NULL'}
              </span>
              <span className="hidden sm:inline mx-1 md:mx-2 h-3 w-px bg-slate-200 dark:bg-slate-800"></span>
              <span className="hidden sm:inline">UTF-8</span>
              <span className="mx-1 md:mx-2 h-3 w-px bg-slate-200 dark:bg-slate-800"></span>
              <span className="font-mono text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-300">V1.3.0</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Fixed Branding on Bottom Left - Authenticated View */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-1">
        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase opacity-60">
          © All Rights Reserved by Lasunfry
        </p>
        <p className="text-[9px] font-medium text-slate-400 opacity-50">
          Designed and Developed by Coddynet infotech
        </p>
      </div>

      {/* Toast Notification Container */}
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

function NoteEditor({ initialContent, onChange, fontSize, isSplitView }: { initialContent: string, onChange: (val: string) => void, fontSize: number, isSplitView: boolean }) {
  const [content, setContent] = useState(initialContent);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const isEditing = useRef(false);

  // Sync with parent ONLY if we aren't editing locally
  useEffect(() => {
    if (!isEditing.current) {
      setContent(initialContent);
    }
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    onChange(newVal);
  };

  return (
    <div className={`flex flex-col overflow-y-auto p-4 md:p-[15px] ${isSplitView ? 'w-1/2 border-r border-slate-100 dark:border-slate-800' : 'w-full'}`}>
      <textarea 
        ref={editorRef}
        onFocus={() => { isEditing.current = true; }}
        onBlur={() => { isEditing.current = false; }}
        style={{ fontSize: `${fontSize}px` }}
        className="editor-area h-full min-h-[500px] w-full resize-none border-none bg-transparent p-0 leading-relaxed text-slate-800 placeholder:text-slate-300 focus:ring-0 dark:text-slate-200 dark:placeholder:text-slate-700 font-mono" 
        placeholder="Start typing your notes here..."
        value={content}
        onChange={handleChange}
      />
    </div>
  );
}

function BrandIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="Lasunfry Logo" 
      width={size} 
      height={size} 
      className={`object-contain ${className}`}
    />
  );
}

function ToolbarButton({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all duration-200" 
      title={title}
    >
      {icon}
    </button>
  );
}
