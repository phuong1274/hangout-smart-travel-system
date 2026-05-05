import apiClient from '@/lib/axios';

export const reviewsApi = {
  getByLocation: (locationId, params) =>
    apiClient.get(`/api/locations/${locationId}/reviews`, { params }),
  getMyReview: (locationId) =>
    apiClient.get(`/api/locations/${locationId}/reviews/me`),
  create: (data) => apiClient.post('/api/reviews', data),
  update: ({ reviewId, ...data }) =>
    apiClient.put(`/api/reviews/${reviewId}`, { reviewId, ...data }),
  remove: (reviewId) => apiClient.delete(`/api/reviews/${reviewId}`),
  report: ({ reviewId, ...data }) =>
    apiClient.post(`/api/reviews/${reviewId}/reports`, { reviewId, ...data }),

  getEligibility: (locationId) =>
    apiClient.get(`/api/locations/${locationId}/reviews/eligibility`),

  getReportedReviews: (params) =>
    apiClient.get('/api/admin/review-reports', { params }),
  getReportedReviewDetail: (reviewId) =>
    apiClient.get(`/api/admin/review-reports/${reviewId}`),
  ignoreReports: (reviewId, resolutionNote) =>
    apiClient.post(`/api/admin/reviews/${reviewId}/ignore-reports`, { resolutionNote }),
  hide: (reviewId) =>
    apiClient.post(`/api/admin/reviews/${reviewId}/hide`),
  unhide: (reviewId) =>
    apiClient.post(`/api/admin/reviews/${reviewId}/unhide`),
  deleteModerated: (reviewId, note) =>
    apiClient.delete(`/api/admin/reviews/${reviewId}`, { params: { note } }),
};
