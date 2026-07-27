'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// Smart invalidation — only refresh what was affected
const INVALIDATION_MAP = {
  tasks: ['tasks', 'daily-tasks-today', 'shared-attendance-today'],
  attendance: ['shared-attendance-today', 'emp-attendance-data', 'att-analytics', 'break-report'],
  leaves: ['leaves'],
  departments: ['shared-departments', 'departments'],
  users: ['shared-users', 'users'],
  announcements: ['announcements'],
  notifications: ['notifications'],
};

export function useSmartMutation(key, mutationFn, options = {}) {
  const qc = useQueryClient();
  const keysToInvalidate = INVALIDATION_MAP[key] || [key];

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Only invalidate related queries, not everything
      keysToInvalidate.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      if (options.successMessage) toast.success(options.successMessage);
      if (options.onSuccess) options.onSuccess(data, variables);
    },
    onError: (error) => {
      if (options.onError) options.onError(error);
    },
    ...options,
  });
}
