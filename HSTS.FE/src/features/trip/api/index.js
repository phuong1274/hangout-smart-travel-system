import apiClient from '@/lib/axios';

// Temporary switch: disable /api/Locations/{id} requests while replacement API is being developed.
const ENABLE_LOCATION_DETAIL_API = true;

// Generate itinerary from trip plan request
export const generateItineraryApi = (data) => {
  return apiClient.post('/api/Itineraries/generate', data, { timeout: 120000 }).then(res => res.data);
};

// Save finalized trip
export const saveTripApi = (data) => {
  return apiClient.post('/api/Trips/save', data).then(res => res.data);
};

// Estimate local travel leg between flexible endpoints (location, transit hub, or coordinates)
export const estimateLocalTravelApi = ({
  fromLocationId,
  fromTransitHubId,
  fromLat,
  fromLng,
  toLocationId,
  toTransitHubId,
  toLat,
  toLng,
  groupSize,
  departureTime,
  currencyCode,
}) => {
  return apiClient.get('/api/Itineraries/local-travel-estimate', {
    params: {
      fromLocationId,
      fromTransitHubId,
      fromLat,
      fromLng,
      toLocationId,
      toTransitHubId,
      toLat,
      toLng,
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

// Lookup all locations of a province via new endpoint: GET /api/locations?provinceId=...
export const getLocationsByProvinceApi = async ({ provinceId, searchTerm, pageSize = 200, pageIndex = 1, locationTypeId }) => {
  const targetProvinceId = Number(provinceId);
  if (!Number.isFinite(targetProvinceId) || targetProvinceId <= 0) {
    return { items: [], totalCount: 0 };
  }

  const targetLocationTypeId = Number(locationTypeId);

  const response = await apiClient.get('/api/locations', {
    params: {
      provinceId: targetProvinceId,
      searchTerm,
      locationTypeIds: Number.isFinite(targetLocationTypeId) && targetLocationTypeId > 0
        ? targetLocationTypeId
        : undefined,
      pageIndex,
      pageSize,
    },
  }).then((res) => res.data);

  const items = response?.items || response?.Items || response?.data || response?.Data || [];

  return {
    items: Array.isArray(items) ? items : [],
    totalCount: response?.totalCount
      || response?.TotalCount
      || (Array.isArray(items) ? items.length : 0),
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
  if (!ENABLE_LOCATION_DETAIL_API) {
    return Promise.resolve(null);
  }
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

// Get trip detail by id (full detail with days, activities, members, summary)
export const getTripDetailApi = (id) => {
  return apiClient.get(`/api/trips/${id}/detail`).then(res => res.data);
};

// Get trips list by user id
export const getTripsApi = (userId) => {
  return apiClient.get(`/api/trips/profile/${userId}`).then(res => res.data);
};

// Delete trip by id
export const deleteTripApi = (id) => {
  return apiClient.delete(`/api/trips/${id}`).then(res => res.data);
};

// Update trip activity status
// Status flow: Upcoming (0) -> InProgress (1) -> Completed (2)
export const updateTripActivityStatusApi = (activityId, status) => {
  return apiClient.patch(`/api/trips/activities/${activityId}/status`, { status }).then(res => res.data);
};

// Log actual expense for an activity
export const logActualExpenseApi = (data) => {
  return apiClient.post('/api/Expenses', data).then(res => res.data);
};

// Update an expense
export const updateExpenseApi = (expenseId, data) => {
  return apiClient.put(`/api/Expenses/${expenseId}`, { expenseId, ...data }).then(res => res.data);
};

// Get expenses by activity (grouped)
export const getExpensesByActivityApi = (tripId) => {
  return apiClient.get(`/api/Expenses/trip/${tripId}/by-activity`).then(res => res.data);
};

// Delete expense
export const deleteExpenseApi = (expenseId) => {
  return apiClient.delete(`/api/Expenses/${expenseId}`).then(res => res.data);
};

// ==================== INVITATIONS API ====================

// Send invitation to a user by email
export const createInvitationApi = (tripId, email) => {
  return apiClient.post(`/api/trips/${tripId}/invitations`, { email }).then(res => res.data);
};

// Verify invitation token
export const verifyInvitationApi = (token) => {
  return apiClient.get('/api/invitations/verify', { params: { token } }).then(res => res.data);
};

// Respond to invitation (accept/reject)
export const respondInvitationApi = (invitationId, isAccepted) => {
  return apiClient.post(`/api/invitations/${invitationId}/respond`, { isAccepted }).then(res => res.data);
};

// Get current user's pending invitations
export const getMyInvitationsApi = () => {
  return apiClient.get('/api/users/me/invitations').then(res => res.data);
};


// ==================== MEMBER MANAGEMENT API ====================

// Get trip members with detail
export const getTripMembersDetailApi = (tripId) => {
  return apiClient.get(`/api/trips/${tripId}/members/detail`).then(res => res.data);
};

// Remove a member from the trip (leader only)
export const removeTripMemberApi = (tripId, userId) => {
  return apiClient.delete(`/api/trips/${tripId}/members/${userId}`).then(res => res.data);
};

// Change member role (leader only)
export const changeMemberRoleApi = (tripId, userId, newRole) => {
  return apiClient.put(`/api/trips/${tripId}/members/${userId}/role`, { newRole }).then(res => res.data);
};
// Batch update activity statuses (complete previous + start current atomically)
export const batchUpdateActivityStatusApi = (data) => {
  return apiClient.post('/api/trips/activities/batch-status', data).then(res => res.data);
};

// Get budget vs actual data for PDF export
export const getBudgetVsActualExportApi = (tripId) => {
  return apiClient.get(`/api/Expenses/trip/${tripId}/budget-vs-actual/export`).then(res => res.data);
};
