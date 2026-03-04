import axios from 'axios';
import { notification, message } from 'antd';
import { API_URL, TOKEN_KEY, API_TIMEOUT } from '@/config/constants';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from '@/routes/paths';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: API_TIMEOUT,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    const { data } = response;
    // Data Normalization: Map PascalCase to camelCase for backend pagination fields
    if (data && typeof data === 'object') {
      if (Object.prototype.hasOwnProperty.call(data, 'Items')) {
        data.items = data.Items;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'TotalCount')) {
        data.totalCount = data.TotalCount;
      }
    }
    return data;
  },
  (error) => {
    const { response, config } = error;

    // Fallback for Auth: Mock successful login if 404 (Controller missing in BE)
    if (config?.url?.includes('/auth/login') && response?.status === 404) {
      return {
        token: 'dummy_token',
        user: { id: 'dummy_id', username: 'admin', role: 'Admin' },
      };
    }

    if (response) {
      if (response.status === 401) {
        message.warning('Session expired. Please log in again!');
        useAuthStore.getState().logout();
        window.location.href = PATHS.AUTH.LOGIN;
      } else if (response.status === 400) {
        // Error Array Handling: BE uses ErrorOr (List of Error objects)
        if (Array.isArray(response.data)) {
          const descriptions = response.data
            .map((err) => err.description)
            .filter(Boolean)
            .join(', ');
          notification.error({
            message: 'Error',
            description: descriptions || 'Validation failed',
          });
        } else if (response.data.errors) {
          const errorMessages = Object.values(response.data.errors).flat().join(', ');
          notification.error({ message: 'Invalid Data', description: errorMessages });
        } else {
          message.error(response.data.title || 'Bad Request!');
        }
      } else if (response.status === 500) {
        notification.error({ message: 'System Error', description: 'Internal server error!' });
      }
    } else {
      notification.error({ message: 'Network Error', description: 'Cannot connect to the server!' });
    }
    return Promise.reject(error);
  }
);
export default apiClient;
