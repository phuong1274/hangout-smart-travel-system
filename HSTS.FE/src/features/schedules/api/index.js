import apiClient from '@/lib/axios';

// ==========================================
// NHÓM 1: CÁC API MASTER DATA 
// ==========================================
export const getDistrictsApi = (params) => {
  return apiClient.get('/api/Districts', { params }).then(res => res.data);
};

export const getDistrictByIdApi = (id) => {
  return apiClient.get(`/api/Districts/${id}`).then(res => res.data);
};

export const createDistrictApi = (data) => {
  return apiClient.post('/api/Districts', data).then(res => res.data);
};

export const updateDistrictApi = (id, data) => {
  return apiClient.put(`/api/Districts/${id}`, data).then(res => res.data);
};

export const deleteDistrictApi = (id) => {
  return apiClient.delete(`/api/Districts/${id}`).then(res => res.data);
};

export const getCountriesApi = () => {
  return apiClient.get('/api/Locations/countries').then(res => res.data);
};

export const getProvincesApi = (countryId) => {
  const params = countryId ? { countryId } : {};
  return apiClient.get('/api/Locations/provinces', { params }).then(res => res.data);
};


// ==========================================
// NHÓM 2: CÁC API DÀNH RIÊNG CHO TÍNH NĂNG TRIP (LỊCH TRÌNH)
// ==========================================

// Lấy thông tin tỉnh/thành cho lịch trình
export const getTripProvinceByIdApi = (id) => {
  return apiClient.get(`/api/trip/provinces/${id}`).then(res => res.data);
};

// Lấy chi tiết 1 địa điểm trong lịch trình
export const getTripLocationByIdApi = (id) => {
  return apiClient.get(`/api/trip/locations/${id}`).then(res => res.data);
};

// Lấy nhiều địa điểm cùng lúc (Batch) - Chuyên dùng để hydrate mảng timeline
export const getTripLocationsBatchApi = (data) => {
  // data: { ids: [97, 64, 103, 114] }
  return apiClient.post('/api/trip/locations/batch', data).then(res => res.data);
};

// Lấy thông tin nhãn (Tags) cho lịch trình
export const getTripTagByIdApi = (id) => {
  return apiClient.get(`/api/trip/tags/${id}`).then(res => res.data);
};

// Lấy danh sách hoặc 1 phương tiện di chuyển
export const getTripTransportModesApi = () => {
  return apiClient.get('/api/trip/transport-modes').then(res => res.data);
};

// (Tùy chọn) API Hydrate tổng - Nếu sau này BE đồng ý gom chung 1 cục
export const hydrateTripItineraryApi = (rawData) => {
  return apiClient.post('/api/trip/hydrate', rawData).then(res => res.data);
};