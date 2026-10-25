import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

import { storageService } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string) => Promise<User>;
  demoLogin: () => Promise<User>;
  logout: () => Promise<void>;
  isLiveFirebase: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously hydrate from localStorage so returning users load with 0ms latency
  const [user, setUser] = useState<User | null>(() => storageService.getUser());
  const [loading, setLoading] = useState<boolean>(() => {
    // If user already in local cache or not in live mode, no blocking loading needed
    if (!authService.isLiveMode()) return false;
    return !storageService.getUser();
  });

  useEffect(() => {
    // Initial check and subscription
    const unsubscribe = authService.onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    try {
      const loggedUser = await authService.login(email, pass);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<User> => {
    setLoading(true);
    try {
      const newUser = await authService.register(name, email, pass);
      setUser(newUser);
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (): Promise<User> => {
    setLoading(true);
    try {
      const u = await authService.demoLogin();
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        demoLogin,
        logout,
        isLiveFirebase: authService.isLiveMode(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
