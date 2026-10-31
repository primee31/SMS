import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, setAccessToken } from '../api/axiosClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth session on load via refresh cookie
  useEffect(() => {
    async function checkAuth() {
      try {
        const refreshRes = await apiClient.post('/auth/refresh');
        const token = refreshRes.data?.data?.accessToken;
        if (token) {
          setAccessToken(token);
          const meRes = await apiClient.get('/auth/me');
          setUser(meRes.data?.data);
        }
      } catch (err) {
        // Not authenticated or refresh expired - expected on cold start without session
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { user: userData, accessToken } = res.data.data;
    setAccessToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await apiClient.post('/auth/register', data);
    const { user: userData, accessToken } = res.data.data;
    setAccessToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request failed:', e);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
