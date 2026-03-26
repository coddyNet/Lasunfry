import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthGuard, GuestGuard, AuthProvider } from 'features/auth';
import { ThemeProvider } from 'features/theme';
import { FileProvider } from 'features/workspace';
import { LoginPage } from 'pages/LoginPage';
import { WorkspacePage } from 'pages/WorkspacePage';
import { NotFoundPage } from 'pages/NotFoundPage';

import { OnboardingProvider } from 'components/Onboarding/OnboardingContext';

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        }
      />

      <Route
        path="/"
        element={
          <AuthGuard>
            <WorkspacePage />
          </AuthGuard>
        }
      />
      <Route
        path="/file/:fileId"
        element={
          <AuthGuard>
            <WorkspacePage />
          </AuthGuard>
        }
      />

      <Route path="/unknown" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/unknown" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <FileProvider>
          <OnboardingProvider>
            <AppRoutes />
          </OnboardingProvider>
        </FileProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
