import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Topbar from './components/layout/Topbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Mfa from './pages/Mfa';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Contracts from './pages/Contracts';
import Deadlines from './pages/Deadlines';
import Security from './pages/Security';
import MfaSetup from './pages/MfaSetup';
import NotFound from './pages/NotFound';

import './styles/styles.css';

const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = [
    '/dashboard',
    '/upload',
    '/documents',
    '/contracts',
    '/deadlines',
    '/security'
  ].some((p) => location.pathname.startsWith(p)) || location.pathname.startsWith('/document/');

  return (
    <>
      <Topbar />
      <main id="app" role="main">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mfa" element={<Mfa />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document/:id"
            element={
              <ProtectedRoute>
                <DocumentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document/:id/:tab"
            element={
              <ProtectedRoute>
                <DocumentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts"
            element={
              <ProtectedRoute>
                <Contracts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deadlines"
            element={
              <ProtectedRoute>
                <Deadlines />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute>
                <Security />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security/mfa-setup"
            element={
              <ProtectedRoute>
                <MfaSetup />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {(!user || !isAuthPage) && <Footer />}
    </>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
