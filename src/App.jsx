import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Topbar from './components/layout/Topbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ThinkingLoader from './components/common/ThinkingLoader';
import LenisProvider from './components/motion/LenisProvider';

// Lazy-loaded Public Pages
const Landing = lazy(() => import('./pages/Landing'));
const Capabilities = lazy(() => import('./pages/Capabilities'));
const CapabilityDetail = lazy(() => import('./pages/CapabilityDetail'));
const Insights = lazy(() => import('./pages/Insights'));
const InsightDetail = lazy(() => import('./pages/InsightDetail'));
const Trust = lazy(() => import('./pages/Trust'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Accessibility = lazy(() => import('./pages/Accessibility'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Lazy-loaded Auth Pages
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Mfa = lazy(() => import('./pages/Mfa'));

// Lazy-loaded Protected Enterprise Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Upload = lazy(() => import('./pages/Upload'));
const Documents = lazy(() => import('./pages/Documents'));
const DocumentDetail = lazy(() => import('./pages/DocumentDetail'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Security = lazy(() => import('./pages/Security'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const MfaSetup = lazy(() => import('./pages/MfaSetup'));

import './styles/styles.css';

const RouteLoadingFallback = () => (
  <div className="w-full bg-paper min-h-[70vh] flex items-center justify-center py-24">
    <ThinkingLoader
      state="working"
      size={56}
      caption="Loading DocuGuard chamber..."
      subcaption="Establishing isolated session and preparing secure workspace"
    />
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
      <main id="app" role="main" className="flex-1">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public Marketing & Intelligence Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/capabilities" element={<Capabilities />} />
            <Route path="/capabilities/:slug" element={<CapabilityDetail />} />
            <Route path="/intelligence" element={<Insights />} />
            <Route path="/intelligence/:slug" element={<InsightDetail />} />
            <Route path="/trust" element={<Trust />} />
            <Route path="/about" element={<Trust />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/accessibility" element={<Accessibility />} />

            {/* Authentication Routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mfa" element={<Mfa />} />

            {/* Protected Enterprise Portal Routes (Preserved 100%) */}
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
              element={<Navigate to="/portfolio?tab=deadlines" replace />}
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
          <LenisProvider>
            <AppContent />
          </LenisProvider>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
