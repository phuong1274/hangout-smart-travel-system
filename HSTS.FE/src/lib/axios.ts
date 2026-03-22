import axios from 'axios';
import { API_URL } from '@/config/constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Read XSRF-TOKEN cookie and send as header for CSRF protection
const getCookie = (name: string): string | undefined => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2];
};

api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Silent refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// Retry logic for 429 rate limit errors
const retryRequest = async (config: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)
      await new Promise(resolve => setTimeout(resolve, delay));
      const response = await api(config);
      return response;
    } catch (error: any) {
      if (error.response?.status !== 429 || i === maxRetries - 1) {
        throw error;
      }
      // Continue retrying on 429
    }
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 429 Too Many Requests with retry
    if (error.response?.status === 429 && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    if (error.response?.status === 429 && (originalRequest._retryCount || 0) < 3) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const retryCount = originalRequest._retryCount;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(api(originalRequest));
        }, delay);
      });
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh endpoint itself
      if (originalRequest.url === '/api/auth/refresh-token') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/api/auth/refresh-token');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
