import axios from 'axios';
import * as authService from './authService';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupResponseInterceptor = (handleLogin, logout) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response?.status !== 401 ||
        originalRequest.url.includes('/api/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const data = await authService.refresh();

        // Lưu token mới
        localStorage.setItem('hsts_access_token', data.accessToken);
        api.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${data.accessToken}`;

        // Cập nhật context
        handleLogin(data);

        processQueue(null, data.accessToken);

        originalRequest.headers[
          'Authorization'
        ] = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        localStorage.removeItem('hsts_access_token');
        logout();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};

export default api;