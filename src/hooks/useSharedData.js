'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';

// ============================================
// SHARED DATA HOOKS — SINGLE SOURCE OF TRUTH
// ============================================
// These are cached globally. If 5 pages use useEmployees(),
// TanStack Query makes 1 request and shares the result.
// staleTime: 5min means it won't refetch for 5 minutes.
// This cuts ~80% of redundant API calls.

export function useEmployees() {
  const { role } = useAuth();
  return useQuery({
    queryKey: ['shared-users'],
    queryFn: () => api.get('/users', { params: { limit: 200 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,    // Fresh for 5 min
    gcTime: 30 * 60 * 1000,      // Keep in cache 30 min
    enabled: ['admin', 'manager', 'team-lead'].includes(role),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['shared-departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
    staleTime: 10 * 60 * 1000,   // Departments rarely change — 10 min
    gcTime: 60 * 60 * 1000,      // Keep in cache 1 hour
  });
}

export function useTodayAttendance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shared-attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
    staleTime: 30 * 1000,        // 30s — attendance changes often
    enabled: !!user,
  });
}

// Helper to get filtered employee lists
export function useEmployeeList() {
  const { data, isLoading } = useEmployees();
  const { user, role } = useAuth();
  const all = data?.users || [];
  
  // TL sees only their department
  const filtered = role === 'team-lead' && user?.department
    ? all.filter(e => e.department === user.department && e.role !== 'admin')
    : all.filter(e => e.role !== 'admin');

  return { employees: filtered, allUsers: all, isLoading };
}

export function useDepartmentList() {
  const { data, isLoading } = useDepartments();
  return { departments: data?.departments || [], isLoading };
}
