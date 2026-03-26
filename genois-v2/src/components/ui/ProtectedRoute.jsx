import React from 'react';
import { Navigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import Loader from './Loader';

const ProtectedRoute = ({ children, role }) => {
  const { user, profile, loading } = useStore();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && profile?.role !== role) {
    return <Navigate to="/student/dashboard" replace />;
  }
  return children;
};

export default ProtectedRoute;
