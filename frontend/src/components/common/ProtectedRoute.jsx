import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();

  if (!token) {
    // If no token, redirect to login page
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;