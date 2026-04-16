import apiClient from '@/lib/axios';

export const getAdminDashboardSummaryApi = () => {
  return apiClient.get('/api/Dashboard/summary').then((res) => res.data);
};

export const getAdminDashboardInsightsApi = () => {
  return apiClient.get('/api/Dashboard/insights').then((res) => res.data);
};

export const getAdminDashboardTrendsApi = (months = 6) => {
  return apiClient.get('/api/Dashboard/trends', { params: { months } }).then((res) => res.data);
};

export const getAdminDashboardQueuesApi = () => {
  return apiClient.get('/api/Dashboard/queues').then((res) => res.data);
};
