import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

const SILENT_URLS = ['/notifications', '/attendance/break', '/attendance/today', '/attendance/analytics', '/dashboard', '/auth/me', '/daily-tasks', '/performance', '/leaves'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (offline, timeout)
    if (!error.response) {
      const url = error.config?.url || '';
      const isSilent = SILENT_URLS.some(s => url.includes(s));
      if (!isSilent) {
        toast.error('Network error. Check your connection.');
      }
      return Promise.reject(error);
    }

    const url = error.config?.url || '';
    const status = error.response.status;
    const message = error.response?.data?.error || 'Something went wrong';

    if (status === 401) {
      const isAuthCheck = url.includes('/auth/me');
      const isOnAuth = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/signup');
      if (!isAuthCheck && !isOnAuth && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Only show toasts for user-initiated actions, not background polls
    const isSilent = SILENT_URLS.some(s => url.includes(s));
    const isGet = error.config?.method === 'get';
    if (!isSilent || !isGet) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
