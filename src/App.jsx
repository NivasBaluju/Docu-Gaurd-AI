import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Topbar from './components/layout/Topbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import SkeletonLoader from './components/common/SkeletonLoader';

// Lazy-loaded route components for production code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Mfa = lazy(() => import('./pages/Mfa'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Upload = lazy(() => import('./pages/Upload'));
const Documents = lazy(() => import('./pages/Documents'));
const DocumentDetail = lazy(() => import('./pages/DocumentDetail'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Deadlines = lazy(() => import('./pages/Deadlines'));
const Security = lazy(() => import('./pages/Security'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const MfaSetup = lazy(() => import('./pages/MfaSetup'));
const NotFound = lazy(() => import('./pages/NotFound'));

import './styles/styles.css';

const RouteLoadingFallback = () => (
  <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
    <SkeletonLoader.Text lines={2} width="280px" />
    <div style={{ marginTop: '20px' }}>
      <SkeletonLoader.Card count={2} height="220px" />
    </div>
  </div>
);

const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = [
    '/dashboard',
    '/upload',
    '/documents',
    '/contracts',
    '/portfolio',
    '/deadlines',
    '/security'
  ].some((p) => location.pathname.startsWith(p)) || location.pathname.startsWith('/document/');

  return (
    <>
      <Topbar />
      <main id="app" role="main">
        <Suspense fallback={<RouteLoadingFallback />}>
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
              path="/portfolio"
              element={
                <ProtectedRoute>
                  <Portfolio />
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
        </Suspense>
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
