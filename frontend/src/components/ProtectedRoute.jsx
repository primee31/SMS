import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-medium text-slate-300">Authenticating...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default authorized landing dashboard
    const defaultPath = user.role === 'ADMIN' ? '/admin' : user.role === 'STAFF' ? '/staff' : '/customer';
    return <Navigate to={defaultPath} replace />;
  }

  return children;
}
