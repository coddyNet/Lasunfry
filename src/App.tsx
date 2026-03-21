import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from 'features/auth';
import { ThemeProvider } from 'features/theme';
import { FileProvider } from 'features/workspace';
import { LoginPage } from 'pages/LoginPage';
import { WorkspacePage } from 'pages/WorkspacePage';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { user, isAuthReady } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <Loader2 className="h-8 w-8 animate-spin text-google-blue dark:text-google-blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" state={{ from: location.pathname }} replace />} />
      </Routes>
    );
  }

  return (
    <FileProvider>
      <Routes>
        <Route path="/login" element={<Navigate to={location.state?.from || "/"} replace />} />
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/file/:fileId" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </FileProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </AuthProvider>
  );
}
