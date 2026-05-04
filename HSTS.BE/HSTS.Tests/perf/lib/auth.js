// HSTS authentication helpers for k6
// Handles JWT httpOnly cookies + XSRF-TOKEN (CSRF) flow

import http from 'k6/http';
import { check } from 'k6';
import { getBaseUrl } from '../config/environments.js';
import { auth as endpoints } from './endpoints.js';

const base = () => getBaseUrl();

// Test accounts - create these in DB before running perf tests
const TEST_ACCOUNTS = {
  admin:     { email: __ENV.ADMIN_EMAIL     || 'perf-admin@test.com',     password: __ENV.ADMIN_PASS     || 'PerfTest123!' },
  traveler:  { email: __ENV.TRAVELER_EMAIL  || 'perf-traveler@test.com',  password: __ENV.TRAVELER_PASS  || 'PerfTest123!' },
  moderator: { email: __ENV.MOD_EMAIL       || 'perf-mod@test.com',       password: __ENV.MOD_PASS       || 'PerfTest123!' },
};

// Login and return auth context with CSRF token
export function login(role = 'traveler') {
  const creds = TEST_ACCOUNTS[role];
  const res = http.post(
    `${base()}${endpoints.login}`,
    JSON.stringify(creds),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const ok = check(res, {
    'login successful': (r) => r.status === 200,
  });

  if (!ok) {
    console.error(`Login failed for ${role}: ${res.status} ${res.body}`);
    return null;
  }

  // Extract XSRF-TOKEN from response cookies
  const xsrfCookie = res.cookies['XSRF-TOKEN']?.[0];
  const xsrfToken = xsrfCookie ? xsrfCookie.value : '';

  return {
    xsrfToken,
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': xsrfToken,
    },
  };
}

// Headers for CSRF-protected requests (POST, PUT, DELETE)
export function csrfHeaders(ctx) {
  return {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': ctx.xsrfToken,
  };
}

// Headers for auth-only requests (GET, or CSRF-exempt paths like /itineraries/generate)
export function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

// Refresh token, update CSRF in context
export function refreshIfNeeded(ctx) {
  const res = http.post(
    `${base()}${endpoints.refreshToken}`,
    null,
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status === 200) {
    const xsrfCookie = res.cookies['XSRF-TOKEN']?.[0];
    if (xsrfCookie) {
      ctx.xsrfToken = xsrfCookie.value;
      ctx.headers['X-XSRF-TOKEN'] = ctx.xsrfToken;
    }
    return true;
  }
  return false;
}

// Register a new test user (for setup)
export function register(email, password = 'PerfTest123!') {
  return http.post(
    `${base()}${endpoints.register}`,
    JSON.stringify({ email, password, confirmPassword: password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
