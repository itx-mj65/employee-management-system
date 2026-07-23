import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'Something went wrong';
    const requestUrl = error.config?.url || '';

    if (error.response?.status === 401) {
      // Don't redirect for auth/me calls (expected to fail when not logged in)
      // Don't redirect if already on login page
      const isAuthCheck = requestUrl.includes('/auth/me');
      const isOnLogin = typeof window !== 'undefined' && window.location.pathname === '/login';

      if (!isAuthCheck && !isOnLogin && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
