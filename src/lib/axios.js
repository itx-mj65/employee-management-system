import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 25000,
  headers: { 'Content-Type': 'application/json' },
});

// ALL GET endpoints are silent — only mutations show errors
const MUTATION_METHODS = ['post', 'put', 'delete', 'patch'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network/timeout errors
    if (!error.response) {
      const isMutation = MUTATION_METHODS.includes(error.config?.method);
      if (isMutation) toast.error('Network error. Please try again.');
      return Promise.reject(error);
    }

    const status = error.response.status;
    const message = error.response?.data?.error || 'Something went wrong';
    const method = error.config?.method;
    const url = error.config?.url || '';

    // 401 — redirect to login (except auth endpoints)
    if (status === 401) {
      const skip = ['/auth/me', '/auth/login', '/auth/signup'].some(p => url.includes(p));
      const onAuth = typeof window !== 'undefined' && ['/login', '/signup'].includes(window.location.pathname);
      if (!skip && !onAuth && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Only show toast for user-initiated mutations (POST/PUT/DELETE), never for GET
    if (MUTATION_METHODS.includes(method)) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
