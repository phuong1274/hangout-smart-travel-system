import axios from 'axios';
import { notification, message } from 'antd';
import { API_URL, TOKEN_KEY } from '../config/constants';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
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
  (response) => response.data,
  (error) => {
    const { response } = error;
    if (response) {
      if (response.status === 400) {
        if (response.data.errors) {
          const errorMessages = Object.values(response.data.errors).flat().join(', ');
          notification.error({ message: 'Invalid Data', description: errorMessages });
        } else {
          message.error(response.data.title || 'Bad Request!');
        }
      } else if (response.status === 401) {
        message.warning('Session expired. Please log in again!');
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
