import React, { useState, useEffect, type ReactNode } from 'react';
import { AuthContext } from './authContextValue';
import type { User } from '../types/index';
import { authApi } from '../services/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Loading from the first render when a token is stored, so protected routes wait for
  // verification instead of redirecting a signed-in user to /login on reload.
  const [isLoading, setIsLoading] = useState(() => localStorage.getItem('token') !== null);

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await authApi.verify();
          setUser(response.user);
          setToken(storedToken);
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    verifyToken();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
