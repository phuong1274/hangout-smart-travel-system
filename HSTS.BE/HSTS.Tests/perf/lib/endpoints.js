// HSTS API endpoint constants
// All routes are relative to base URL (e.g. https://localhost:7139/api)

const auth = {
  register: '/auth/register',
  verifyEmail: '/auth/verify-email',
  resendOtp: '/auth/resend-otp',
  login: '/auth/login',
  googleLogin: '/auth/google-login',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  refreshToken: '/auth/refresh-token',
  logout: '/auth/logout',
  changePassword: '/auth/change-password',
  completeOnboarding: '/auth/complete-onboarding',
};

const locations = {
  list: '/locations',
  adminAll: '/locations/admin/all',
  partnerMy: '/locations/partner/my',
  detail: (id) => `/locations/${id}`,
  create: '/locations',
  update: (id) => `/locations/${id}`,
  delete: (id) => `/locations/${id}`,
  checkDuplicate: '/locations/check-duplicate',
  countries: '/locations/countries',
  provinces: '/locations/provinces',
};

const publicLocations = {
  list: '/publiclocations',
  detail: (id) => `/publiclocations/${id}`,
};

const itineraries = {
  generate: '/itineraries/generate',
  sandboxTransport: '/itineraries/sandbox-transport-options',
  localTravelEstimate: '/itineraries/local-travel-estimate',
};

const dashboard = {
  summary: '/dashboard/summary',
  trends: '/dashboard/trends',
  insights: '/dashboard/insights',
  queues: '/dashboard/queues',
};

const reviews = {
  byLocation: (locationId) => `/locations/${locationId}/reviews`,
  eligibility: (locationId) => `/locations/${locationId}/reviews/eligibility`,
  myReview: (locationId) => `/locations/${locationId}/reviews/me`,
  create: '/reviews',
  update: (id) => `/reviews/${id}`,
  delete: (id) => `/reviews/${id}`,
  report: (id) => `/reviews/${id}/reports`,
};

const users = {
  me: '/users/me',
  updateMe: '/users/me',
  avatar: '/users/me/avatar',
  list: '/users',
  detail: (id) => `/users/${id}`,
  create: '/users',
  changeRole: (id) => `/users/${id}/role`,
  ban: (id) => `/users/${id}/ban`,
  unban: (id) => `/users/${id}/unban`,
  roles: '/users/roles',
};

const trips = {
  detail: (id) => `/trips/${id}/detail`,
  byProfile: (profileId) => `/trips/profile/${profileId}`,
  create: '/trips',
  save: '/trips/save',
  update: (id) => `/trips/${id}`,
  delete: (id) => `/trips/${id}`,
  updateStatus: (id) => `/trips/${id}/status`,
};

const expenses = {
  detail: (id) => `/expenses/${id}`,
  byTrip: (tripId) => `/expenses/trip/${tripId}`,
  totalByTrip: (tripId) => `/expenses/trip/${tripId}/total`,
  byTimeline: (tripId) => `/expenses/trip/${tripId}/by-timeline`,
  budgetVsActual: (tripId) => `/expenses/trip/${tripId}/budget-vs-actual`,
  exportBudgetVsActual: (tripId) => `/expenses/trip/${tripId}/budget-vs-actual/export`,
  byActivity: (tripId) => `/expenses/trip/${tripId}/by-activity`,
  create: '/expenses',
  update: (id) => `/expenses/${id}`,
  delete: (id) => `/expenses/${id}`,
};

const home = {
  discovery: '/home/discovery',
  destinations: '/home/destinations',
};

const tags = {
  list: '/tags',
  detail: (id) => `/tags/${id}`,
  root: '/tags/root',
  children: (parentId) => `/tags/parent/${parentId}`,
  create: '/tags',
  update: (id) => `/tags/${id}`,
  delete: (id) => `/tags/${id}`,
};

const amenities = {
  list: '/amenities',
  detail: (id) => `/amenities/${id}`,
  create: '/amenities',
  update: (id) => `/amenities/${id}`,
  delete: (id) => `/amenities/${id}`,
};

export {
  auth, locations, publicLocations, itineraries, dashboard,
  reviews, users, trips, expenses, home, tags, amenities,
};
