export const APP_NAME = 'Hangout - Smart Travel System';

export const API_URL = import.meta.env.VITE_API_BASE_URL || '';

export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
export const GOOGLE_OAUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';
export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50],
};

export const ROLES = {
  ADMIN: 'ADMIN',
  CONTENT_MODERATOR: 'CONTENT_MODERATOR',
  PARTNER: 'PARTNER',
  TRAVELER: 'TRAVELER',
};

export const TOKEN_KEY = 'auth-storage';
