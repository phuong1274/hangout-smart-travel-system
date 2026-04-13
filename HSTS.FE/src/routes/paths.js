export const PATHS = {
  AUTH: {
    ROOT: '/auth',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  DASHBOARD: '/dashboard',
  SCHEDULES: '/schedules',
  DESTINATIONS: '/destinations',
  TAGS: '/tags',
  LOCATION_TYPES: '/location-types',
  LOCATIONS: '/locations',
  PUBLIC_LOCATIONS: '/explore/locations',
  PUBLIC_LOCATION_DETAIL: (id = ':id') => `/explore/locations/${id}`,
  AMENITIES: '/amenities',
  ITINERARY: '/itinerary',
  MY_LOCATIONS: '/my-locations',
  USERS: '/users',
  USER_DETAIL: (id = ':id') => `/users/${id}`,
  REPORTED_REVIEWS: '/reviews/reported',
  LOCATION_SUBMISSIONS_REVIEW: '/admin/location-submissions',
  PROFILE: '/profile',
  PARTNER_LOCATIONS: '/partner/locations',
  CREATE_TRIP: '/create-trip',
  TRIP_DETAIL: '/trips/:id',
  UNAUTHORIZED: '/403',
  NOT_FOUND: '*',
};

export const buildCreateTripPath = ({ provinceId, districtId, locationId, tagIds } = {}) => {
  // Supported prefill params: provinceId, districtId, locationId, tagIds (comma-separated ids).
  const query = new URLSearchParams();

  if (provinceId !== undefined && provinceId !== null && provinceId !== '') {
    query.set('provinceId', String(provinceId));
  }

  if (districtId !== undefined && districtId !== null && districtId !== '') {
    query.set('districtId', String(districtId));
  }

  if (locationId !== undefined && locationId !== null && locationId !== '') {
    query.set('locationId', String(locationId));
  }

  const normalizedTagIds = Array.isArray(tagIds)
    ? tagIds
        .map((tagId) => Number(tagId))
        .filter((tagId) => Number.isFinite(tagId))
    : [];

  if (normalizedTagIds.length > 0) {
    query.set('tagIds', normalizedTagIds.join(','));
  }

  const queryString = query.toString();
  return queryString ? `${PATHS.CREATE_TRIP}?${queryString}` : PATHS.CREATE_TRIP;
};
