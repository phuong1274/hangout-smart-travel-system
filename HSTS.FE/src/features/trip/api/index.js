import apiClient from '@/lib/axios';

// Generate itinerary from trip plan request
export const generateItineraryApi = (data) => {
  return apiClient.post('/api/Itineraries/generate', data, { timeout: 120000 }).then(res => res.data);
};

// Estimate local travel leg between two locations
export const estimateLocalTravelApi = ({ fromLocationId, toLocationId, groupSize, departureTime, currencyCode }) => {
  return apiClient.get('/api/Itineraries/local-travel-estimate', {
    params: {
      fromLocationId,
      toLocationId,
      groupSize,
      departureTime,
      currencyCode,
    },
  }).then(res => res.data);
};

// Get provinces from Locations API (supports optional country filter)
export const getLocationProvincesApi = (countryId) => {
  const params = countryId ? { countryId } : {};
  return apiClient.get('/api/Locations/provinces', { params }).then(res => res.data);
};

// Get locations by district ids from Locations API
export const getLocationsByDistrictIdsApi = ({ districtIds, pageIndex = 1, pageSize = 200, searchTerm }) => {
  return apiClient.get('/api/Locations', {
    params: {
      districtIds,
      pageIndex,
      pageSize,
      searchTerm,
    },
  }).then(res => res.data);
};

// Lookup all locations of a province (uses /api/Locations/provinces as validation source)
export const getLocationsByProvinceApi = async ({ provinceId, countryId, searchTerm, pageSize = 200 }) => {
  const targetProvinceId = Number(provinceId);
  if (!Number.isFinite(targetProvinceId) || targetProvinceId <= 0) {
    return { items: [], totalCount: 0 };
  }

  const provincesRaw = await getLocationProvincesApi(countryId);
  const provinces = Array.isArray(provincesRaw)
    ? provincesRaw
    : (provincesRaw?.items || provincesRaw?.Items || []);
  const provinceExists = provinces.some((province) => Number(province?.id ?? province?.Id) === targetProvinceId);
  if (!provinceExists) {
    return { items: [], totalCount: 0 };
  }

  const districtsRaw = await getDistrictsByProvinceApi(targetProvinceId);
  const districts = Array.isArray(districtsRaw)
    ? districtsRaw
    : (districtsRaw?.items || districtsRaw?.Items || []);
  const districtIds = districts
    .map((district) => Number(district?.id ?? district?.Id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!districtIds.length) {
    return { items: [], totalCount: 0 };
  }

  const response = await getLocationsByDistrictIdsApi({
    districtIds,
    pageIndex: 1,
    pageSize,
    searchTerm,
  });

  return {
    items: response?.items || response?.Items || [],
    totalCount: response?.totalCount || response?.TotalCount || 0,
  };
};

// Get all provinces for dropdown
export const getProvincesApi = () => {
  return apiClient.get('/api/common/provinces').then(res => res.data);
};

// Get districts by province
export const getDistrictsByProvinceApi = (provinceId) => {
  return apiClient.get(`/api/common/provinces/${provinceId}/districts`).then(res => res.data);
};

// Get all districts
export const getAllDistrictsApi = () => {
  return apiClient.get('/api/common/districts').then(res => res.data);
};

// Get root tags (level 1)
export const getRootTagsApi = () => {
  return apiClient.get('/api/Tags/root').then(res => res.data);
};

// Get child tags by parent
export const getChildTagsApi = (parentTagId) => {
  return apiClient.get(`/api/Tags/parent/${parentTagId}`).then(res => res.data);
};

// Get location detail by id
export const getLocationByIdApi = (id) => {
  return apiClient.get(`/api/Locations/${id}`).then(res => res.data);
};

// Get all location types
export const getLocationTypesApi = () => {
  return apiClient.get('/api/LocationTypes').then(res => res.data);
};

// Get all amenities
export const getAmenitiesApi = () => {
  return apiClient.get('/api/Amenities').then(res => res.data);
};
