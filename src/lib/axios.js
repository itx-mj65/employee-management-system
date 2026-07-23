import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// URLs that poll in the background — never show error toasts for these
const SILENT_URLS = ['/notifications', '/attendance/break', '/attendance/today', '/attendance/analytics', '/dashboard', '/auth/me', '/daily-tasks', '/performance'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const status = error.response?.status;
    const message = error.response?.data?.error || 'Something went wrong';

    // Auth errors
    if (status === 401) {
      const isAuthCheck = url.includes('/auth/me');
      const isOnLogin = typeof window !== 'undefined' && window.location.pathname === '/login';
      if (!isAuthCheck && !isOnLogin && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Only show toasts for USER-INITIATED actions (mutations), not background polls
    const isSilent = SILENT_URLS.some(s => url.includes(s));
    const isGet = error.config?.method === 'get';

    if (!isSilent || !isGet) {
      // This is a user action (POST/PUT/DELETE) or a non-silent URL — show toast
      toast.error(message);
    }
    // Background polls fail silently — TanStack Query handles retry

    return Promise.reject(error);
  }
);

export default api;
