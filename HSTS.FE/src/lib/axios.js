import axios from 'axios';
import { notification, message } from 'antd';
import { API_URL } from '@/config/constants';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2];
};

apiClient.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve();
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data && typeof data === 'object') {
      if (Object.prototype.hasOwnProperty.call(data, 'Items')) data.items = data.Items;
      if (Object.prototype.hasOwnProperty.call(data, 'TotalCount')) data.totalCount = data.TotalCount;
    }
    return response;
  },
  async (error) => {
    const { response, config } = error;

    if (response?.status === 401 && !config._retry) {
      if (config.url?.includes('/api/auth/refresh-token')) {
        localStorage.removeItem('auth-storage');
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(config));
      }

      config._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/api/auth/refresh-token');
        processQueue(null);
        return apiClient(config);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('auth-storage');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (response) {
      if (response.status === 400) {
        if (Array.isArray(response.data)) {
          const descriptions = response.data.map((e) => e.description).filter(Boolean).join(', ');
          notification.error({ message: 'Error', description: descriptions || 'Validation failed' });
        } else if (response.data?.errors) {
          const msgs = Object.values(response.data.errors).flat().join(', ');
          notification.error({ message: 'Invalid Data', description: msgs });
        } else {
          message.error(response.data?.title || 'Bad Request');
        }
      } else if (response.status === 403) {
        message.error('You do not have permission to do this.');
      } else if (response.status === 500) {
        notification.error({ message: 'System Error', description: 'Internal server error!' });
      }
    } else {
      notification.error({ message: 'Network Error', description: 'Cannot connect to the server!' });
    }

    return Promise.reject(error);
  },
);

export default apiClient;
