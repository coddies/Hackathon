import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserResponse } from '../types';
import type { LoginPayload, RegisterPayload } from '../api/auth';
import { authApi } from '../api/auth';

export interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOpsAgent: boolean;
  isPassenger: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(() => {
    const saved = localStorage.getItem('skyflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('skyflow_access_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const currentToken = localStorage.getItem('skyflow_access_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('skyflow_user', JSON.stringify(userData));
    } catch {
      // If token invalid, clear
      localStorage.removeItem('skyflow_access_token');
      localStorage.removeItem('skyflow_refresh_token');
      localStorage.removeItem('skyflow_user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('skyflow_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('skyflow_auth_expired', handleAuthExpired);
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const tokenResp = await authApi.login(payload);
      localStorage.setItem('skyflow_access_token', tokenResp.access_token);
      localStorage.setItem('skyflow_refresh_token', tokenResp.refresh_token);
      setToken(tokenResp.access_token);
      
      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('skyflow_user', JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      await authApi.register(payload);
      // Auto login after registration
      await login({ email: payload.email, password: payload.password });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('skyflow_access_token');
    localStorage.removeItem('skyflow_refresh_token');
    localStorage.removeItem('skyflow_user');
    setUser(null);
    setToken(null);
  };

  const role = user?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isOpsAgent = role === 'OPS_AGENT';
  const isAdmin = isSuperAdmin || isOpsAgent;
  const isPassenger = role === 'PASSENGER' || !role;
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        isAdmin,
        isSuperAdmin,
        isOpsAgent,
        isPassenger,
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
