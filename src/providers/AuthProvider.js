'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/signup') {
      setLoading(false);
      return;
    }
    fetchUser();
  }, [fetchUser, pathname]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    toast.success('Welcome back!');
    // Use window.location for reliable redirect — router.push sometimes doesn't work on login
    window.location.href = '/dashboard';
    return data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    window.location.href = '/login';
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, logout, fetchUser, 
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'manager',
      isTeamLead: user?.role === 'team-lead',
      isEmployee: user?.role === 'employee',
      canApprove: ['admin', 'manager', 'team-lead'].includes(user?.role),
      role: user?.role,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
