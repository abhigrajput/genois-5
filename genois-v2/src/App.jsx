import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import Loader from './components/ui/Loader';
import ProtectedRoute from './components/ui/ProtectedRoute';

const Landing     = lazy(() => import('./pages/Landing'));
const Login       = lazy(() => import('./pages/Auth/Login'));
const Register    = lazy(() => import('./pages/Auth/Register'));
const Dashboard   = lazy(() => import('./pages/Student/Dashboard'));
const Roadmap     = lazy(() => import('./pages/Student/Roadmap'));
const Tasks       = lazy(() => import('./pages/Student/Tasks'));
const Tests       = lazy(() => import('./pages/Student/Tests'));
const Notes       = lazy(() => import('./pages/Student/Notes'));
const Profile     = lazy(() => import('./pages/Student/Profile'));
const Analytics   = lazy(() => import('./pages/Student/Analytics'));
const Mentor      = lazy(() => import('./pages/Student/Mentor'));
const Chat2AM     = lazy(() => import('./pages/Student/Chat2AM'));
const Projects    = lazy(() => import('./pages/Student/Projects'));
const Leaderboard = lazy(() => import('./pages/Student/Leaderboard'));
const Pricing     = lazy(() => import('./pages/Pricing'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const DomainExplorer = lazy(() => import('./pages/DomainExplorer'));

const AppRoutes = () => {
  useAuth();
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/u/:id" element={<PublicProfile />} />
        <Route path="/explore-domains" element={
          <ProtectedRoute><DomainExplorer /></ProtectedRoute>
        } />
        <Route path="/student/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/student/roadmap" element={
          <ProtectedRoute><Roadmap /></ProtectedRoute>
        } />
        <Route path="/student/tasks" element={
          <ProtectedRoute><Tasks /></ProtectedRoute>
        } />
        <Route path="/student/tests" element={
          <ProtectedRoute><Tests /></ProtectedRoute>
        } />
        <Route path="/student/notes" element={
          <ProtectedRoute><Notes /></ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/student/analytics" element={
          <ProtectedRoute><Analytics /></ProtectedRoute>
        } />
        <Route path="/student/mentor" element={
          <ProtectedRoute><Mentor /></ProtectedRoute>
        } />
        <Route path="/student/chat" element={
          <ProtectedRoute><Chat2AM /></ProtectedRoute>
        } />
        <Route path="/student/projects" element={
          <ProtectedRoute><Projects /></ProtectedRoute>
        } />
        <Route path="/student/leaderboard" element={
          <ProtectedRoute><Leaderboard /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <BrowserRouter>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#0A0A0F',
          color: '#E2E2F0',
          border: '1px solid rgba(0,255,148,0.2)',
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '13px',
        },
      }}
    />
    <AppRoutes />
  </BrowserRouter>
);

export default App;
