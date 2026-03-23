import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthGuard, GuestGuard, AuthProvider } from 'features/auth';
import { ThemeProvider } from 'features/theme';
import { FileProvider } from 'features/workspace';
import { LoginPage } from 'pages/LoginPage';
import { WorkspacePage } from 'pages/WorkspacePage';
import { NotFoundPage } from 'pages/NotFoundPage';

function AppRoutes() {
  return (
    <Routes>
      {/* Public Guest Routes */}
      <Route
        path="/login"
        element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        }
      />

      {/* Protected Workspace Routes */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <FileProvider>
              <WorkspacePage />
            </FileProvider>
          </AuthGuard>
        }
      />
      <Route
        path="/file/:fileId"
        element={
          <AuthGuard>
            <FileProvider>
              <WorkspacePage />
            </FileProvider>
          </AuthGuard>
        }
      />

      {/* 404 Route */}
      <Route path="/unknown" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/unknown" replace />} />
    </Routes>
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
