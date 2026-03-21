import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db, doc, onSnapshot, setDoc } from 'config/firebase';
import { useAuth } from 'features/auth';
import { FormattingSettings, DEFAULT_FORMATTING_SETTINGS } from 'features/editor';

interface ThemeContextType {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  formattingSettings: FormattingSettings;
  updateFormattingSettings: (settings: FormattingSettings) => Promise<void>;
  editorFontSize: number;
  setEditorFontSize: (val: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [formattingSettings, setFormattingSettings] = useState<FormattingSettings>(DEFAULT_FORMATTING_SETTINGS);
  const [editorFontSize, setEditorFontSize] = useState(14); // Removed set for now if unneeded but standard API

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists() && doc.data().formattingSettings) {
        setFormattingSettings(doc.data().formattingSettings);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const updateFormattingSettings = async (newSettings: FormattingSettings) => {
    setFormattingSettings(newSettings);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { formattingSettings: newSettings }, { merge: true });
      } catch (error) {
        console.error("Failed to save formatting settings:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, formattingSettings, updateFormattingSettings, editorFontSize, setEditorFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
