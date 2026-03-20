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
  ChevronDown,
  ChevronRight,
  WrapText,
  Settings2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { correctGrammar } from './services/geminiService';
import { 
  Editor, 
  Transforms, 
  Element as SlateElement, 
  createEditor, 
  Descendant,
  Text
} from 'slate';
import { 
  Slate, 
  Editable, 
  withReact, 
  useSlate, 
  RenderElementProps, 
  RenderLeafProps,
  useSlateStatic,
  ReactEditor
} from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';
import { deserializeMarkdown, serializeMarkdown, formatMarkdown, type FormattingSettings, DEFAULT_FORMATTING_SETTINGS, getInitialSlateValue } from './utils/slateHelpers';
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
              {isQuotaError ? "Quota Exceeded" : "Something went wrong"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-google-blue px-6 py-2 text-sm font-bold text-white hover:bg-google-blue/90"
            >
              Reload Page
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
  content: string | Descendant[];
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
  const [formattingSettings, setFormattingSettings] = useState<FormattingSettings>(DEFAULT_FORMATTING_SETTINGS);
  const isRenamingRef = useRef(false);
  const editorRef = useRef<any>(null); // Slate editor reference

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Load formatting settings from Firestore
        try {
          const userDoc = await onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists() && doc.data().formattingSettings) {
              setFormattingSettings(doc.data().formattingSettings);
            }
          });
        } catch (error) {
          console.error("Error loading settings:", error);
        }
      }
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

  const handleContentChange = React.useCallback((content: any) => {
    if (!activeFileId) return;
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content } : f));
  }, [activeFileId]);

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

  const updateFormattingSettings = async (newSettings: FormattingSettings) => {
    setFormattingSettings(newSettings);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { formattingSettings: newSettings }, { merge: true });
        showToast("Settings saved", "success");
      } catch (error) {
        showToast("Failed to save settings", "error");
      }
    }
  };

  const handleGrammarFix = async () => {
    if (!activeFile || isCorrecting) return;
    setIsCorrecting(true);
    try {
      const contentStr = typeof activeFile.content === 'string' 
        ? activeFile.content 
        : serializeMarkdown(activeFile.content);
        
      const corrected = await correctGrammar(contentStr);
      
      if (typeof activeFile.content === 'string') {
        handleContentChange(corrected);
      } else {
        handleContentChange(deserializeMarkdown(corrected));
      }
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
      let contentToSave = activeFile.content;
      // Always store as markdown string in Firestore to maintain compatibility
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
    
    const timer = setTimeout(() => {
      handleSave();
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(timer);
  }, [activeFile?.content, user]);

  const downloadFile = () => {
    if (!activeFile) return;
    const contentStr = typeof activeFile.content === 'string' 
      ? activeFile.content 
      : serializeMarkdown(activeFile.content);
    const blob = new Blob([contentStr], { type: 'text/plain' });
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
    // Formatting for Slate isn't needed in the same way, but for markdown we can still do it
    if (typeof activeFile.content === 'string') {
      let formatted = activeFile.content
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      handleContentChange(formatted);
    }
  };

  const handleFindReplace = (type: 'find' | 'replace' | 'replaceAll') => {
    if (!activeFile || !findText) return;
    
    // For Slate, we should ideally use Slate's search capability, 
    // but for now we'll convert to string to maintain existing logic
    let content = typeof activeFile.content === 'string' 
      ? activeFile.content 
      : serializeMarkdown(activeFile.content);
      
    if (type === 'find') {
      const index = content.indexOf(findText);
      if (index !== -1 && editorRef.current) {
        // This won't work perfectly for Slate elements but keeps the logic alive
        // Real search in Slate would involve Transforms.select
        showToast("Feature coming soon for rich text!", "info");
      }
    } else if (type === 'replace') {
      const index = content.indexOf(findText);
      if (index !== -1) {
        const newContent = content.substring(0, index) + replaceText + content.substring(index + findText.length);
        if (typeof activeFile.content === 'string') {
          handleContentChange(newContent);
        } else {
          handleContentChange(deserializeMarkdown(newContent));
        }
      }
    } else if (type === 'replaceAll') {
      const newContent = content.split(findText).join(replaceText);
      if (typeof activeFile.content === 'string') {
        handleContentChange(newContent);
      } else {
        handleContentChange(deserializeMarkdown(newContent));
      }
    }
  };

  const stats = useMemo(() => {
    const text = typeof activeFile?.content === 'string' 
      ? activeFile.content 
      : serializeMarkdown(activeFile?.content || []);
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

          {/* Old Editor Toolbar Removed - Now handled inside NoteEditor for Slate context */}

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
              <div className="flex h-full w-full">
                <NoteEditor 
                  initialContent={(activeFile.content as any)} 
                  onChange={handleContentChange}
                  fontSize={editorFontSize}
                  activeFileId={activeFileId}
                  handleGrammarFix={handleGrammarFix}
                  isCorrecting={isCorrecting}
                  showToast={showToast}
                  formattingSettings={formattingSettings}
                  onSettingsChange={updateFormattingSettings}
                />
              </div>            )}
          </div>
          
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

const LIST_TYPES = ['numbered-list', 'bulleted-list']
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify']

const NoteEditor = ({ 
  initialContent, 
  onChange, 
  fontSize, 
  activeFileId,
  handleGrammarFix,
  isCorrecting,
  showToast,
  formattingSettings,
  onSettingsChange
}: { 
  initialContent: string | Descendant[];
  onChange: (val: Descendant[]) => void;
  fontSize: number; 
  activeFileId: string;
  handleGrammarFix: () => void;
  isCorrecting: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  formattingSettings: FormattingSettings;
  onSettingsChange: (settings: FormattingSettings) => void;
}) => {
  const renderElement = React.useCallback((props: RenderElementProps) => <Element {...props} />, [])
  const renderLeaf = React.useCallback((props: RenderLeafProps) => <Leaf {...props} />, [])
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleFormat = () => {
    const markdown = serializeMarkdown(editor.children);
    const formatted = formatMarkdown(markdown, formattingSettings);
    const newNodes = deserializeMarkdown(formatted);
    
    // Replace all nodes
    Transforms.delete(editor, {
      at: {
        anchor: Editor.start(editor, []),
        focus: Editor.end(editor, []),
      },
    });
    Transforms.insertNodes(editor, newNodes);
    showToast("File Formatted!", "success");
  }

  const [value, setValue] = useState<Descendant[]>(() => 
    typeof initialContent === 'string' ? (initialContent ? deserializeMarkdown(initialContent) : getInitialSlateValue()) : (initialContent || getInitialSlateValue())
  );

  // Sync with parent when file changes
  useEffect(() => {
    const newValue = typeof initialContent === 'string' ? (initialContent ? deserializeMarkdown(initialContent) : getInitialSlateValue()) : (initialContent || getInitialSlateValue());
    setValue(newValue);
    // Reset editor state
    editor.children = newValue;
    editor.onChange();
  }, [activeFileId]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event as any)) {
        event.preventDefault()
        const mark = HOTKEYS[hotkey]
        toggleMark(editor, mark)
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-[20px] w-full">
      <Slate 
        editor={editor} 
        initialValue={value}
        onChange={val => {
          setValue(val);
          onChange(val);
        }}
      >
        {/* Internal Toolbar for slate context */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-0.5 md:gap-1">
            <MarkButton format="bold" icon={<Bold size={16} />} title="Bold (Ctrl+B)" />
            <MarkButton format="italic" icon={<Italic size={16} />} title="Italic (Ctrl+I)" />
            <MarkButton format="underline" icon={<Underline size={16} />} title="Underline (Ctrl+U)" />
            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
            {/* Removed H1 and H2 as per user request */}
            <BlockButton format="check-list-item" icon={<CheckSquare size={16} />} title="Check List" />
            <BlockButton format="block-quote" icon={<Quote size={16} />} title="Blockquote" />
            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
            <BlockButton format="bulleted-list" icon={<List size={16} />} title="Bulleted List" />
            <BlockButton format="numbered-list" icon={<List size={16} className="rotate-180" />} title="Numbered List" />
          </div>
          
          <div className="flex items-center gap-1">
            <div className="relative">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={handleFormat}
                  className="flex items-center gap-1.5 px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-all border-r border-slate-200 dark:border-slate-700"
                  title="Format Document"
                >
                  <WrapText size={14} />
                  <span className="hidden sm:inline">Format</span>
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`flex items-center justify-center px-2 py-1 transition-all ${isSettingsOpen ? 'bg-google-blue text-white' : 'text-slate-400 hover:text-google-blue hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  title="Formatting Settings"
                >
                  <Settings2 size={14} />
                </button>
              </div>

              {/* Formatting Settings Dropdown */}
              <AnimatePresence>
                {isSettingsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsSettingsOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 z-20 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90"
                    >
                      <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Formatting Rules</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">List Marker</label>
                          <select 
                            value={formattingSettings.listMarker}
                            onChange={(e) => onSettingsChange({...formattingSettings, listMarker: e.target.value as any})}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="-">Dash (-)</option>
                            <option value="*">Asterisk (*)</option>
                            <option value="+">Plus (+)</option>
                          </select>
                        </div>
                        
                        {[
                          { id: 'collapseEmptyLines', label: 'Collapse Lines' },
                          { id: 'spaceAfterHeading', label: 'Space after #' },
                          { id: 'trimTrailingWhitespace', label: 'Trim Whitespace' }
                        ].map((item) => (
                          <div key={item.id} className="flex items-center justify-between">
                            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{item.label}</label>
                            <button
                              onClick={() => onSettingsChange({ ...formattingSettings, [item.id]: ! (formattingSettings as any)[item.id] })}
                              className={`flex h-4 w-8 items-center rounded-full transition-colors ${
                                (formattingSettings as any)[item.id] ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            >
                              <div className={`h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                                (formattingSettings as any)[item.id] ? 'translate-x-4.5' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleGrammarFix}
              disabled={isCorrecting}
              className="flex items-center gap-1.5 rounded-lg bg-google-blue/10 px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider text-google-blue hover:bg-google-blue/20 transition-all disabled:opacity-50"
              title="Correct Grammar"
            >
              {isCorrecting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span className="hidden sm:inline">Grammar</span>
            </button>
          </div>
        </div>

        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Start typing your masterpieces here..."
          spellCheck
          autoFocus
          onKeyDown={onKeyDown}
          style={{ fontSize: `${fontSize}px` }}
          className="editor-area h-full min-h-[500px] w-full outline-none leading-relaxed text-slate-800 dark:text-slate-200 font-sans"
        />
      </Slate>
    </div>
  );
}

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  )
  const isList = LIST_TYPES.includes(format)

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes((n as any).type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  })

  let newProperties: Partial<SlateElement>
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    } as any
  } else {
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    } as any
  }
  if (newProperties.type === 'check-list-item') {
    (newProperties as any).checked = false;
  }
  Transforms.setNodes<SlateElement>(editor, newProperties)

  if (!isActive && isList) {
    const block = { type: format, children: [] }
    Transforms.wrapNodes(editor, block as any)
  }
}

const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

const isBlockActive = (editor: Editor, format: string, blockType = 'type') => {
  const { selection } = editor
  if (!selection) return false

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as any)[blockType] === format,
    })
  )

  return !!match
}

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor)
  return marks ? (marks as any)[format] === true : false
}

const Element = (props: RenderElementProps) => {
  const { attributes, children, element } = props
  const style = { textAlign: (element as any).align }
  const editor = useSlateStatic()

  switch ((element as any).type) {
    case 'block-quote':
      return (
        <blockquote style={style} {...attributes} className="border-l-4 border-slate-200 pl-4 italic my-4 dark:border-slate-700">
          {children}
        </blockquote>
      )
    case 'bulleted-list':
      return (
        <ul style={style} {...attributes} className="list-disc list-inside my-4 text-slate-700 dark:text-slate-300">
          {children}
        </ul>
      )
    case 'list-item':
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      )
    case 'numbered-list':
      return (
        <ol style={style} {...attributes} className="list-decimal list-inside my-4">
          {children}
        </ol>
      )
    case 'check-list-item':
      const checked = (element as any).checked
      return (
        <div {...attributes} className="flex flex-row items-center my-1">
          <span contentEditable={false} className="mr-2 select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={event => {
                const path = ReactEditor.findPath(editor, element)
                const newProperties: Partial<SlateElement> = {
                  checked: event.target.checked,
                }
                Transforms.setNodes<SlateElement>(editor, newProperties, { at: path })
              }}
              className="h-4 w-4 rounded border-slate-300 text-google-blue focus:ring-google-blue cursor-pointer"
            />
          </span>
          <span
            style={{ textDecoration: checked ? 'line-through' : 'none' }}
            className={`flex-1 ${checked ? 'opacity-50 italic' : ''}`}
          >
            {children}
          </span>
        </div>
      )
    default:
      return (
        <p style={style} {...attributes} className="my-2">
          {children}
        </p>
      )
  }
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>
  }

  if (leaf.code) {
    children = <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{children}</code>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  return <span {...attributes}>{children}</span>
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

function ToolbarButton({ icon, title, onClick, active, onPointerDown }: { icon: React.ReactNode; title: string; onClick?: () => void; active?: boolean; onPointerDown?: (e: any) => void }) {
  return (
    <button 
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-google-blue text-white shadow-sm' 
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
      }`} 
      title={title}
    >
      {icon}
    </button>
  );
}

const MarkButton = ({ format, icon, title }: { format: string; icon: React.ReactNode; title: string }) => {
  const editor = useSlate()
  return (
    <ToolbarButton
      active={isMarkActive(editor, format)}
      icon={icon}
      title={title}
      onPointerDown={event => {
        event.preventDefault()
        toggleMark(editor, format)
      }}
    />
  )
}

const BlockButton = ({ format, icon, title }: { format: string; icon: React.ReactNode; title: string }) => {
  const editor = useSlate()
  return (
    <ToolbarButton
      active={isBlockActive(
        editor,
        format,
        TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
      )}
      icon={icon}
      title={title}
      onPointerDown={event => {
        event.preventDefault()
        toggleBlock(editor, format)
      }}
    />
  )
}
