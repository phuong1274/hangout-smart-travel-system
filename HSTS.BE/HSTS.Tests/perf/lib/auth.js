// HSTS authentication helpers for k6
// Handles JWT httpOnly cookies + XSRF-TOKEN (CSRF) flow

import http from 'k6/http';
import { check } from 'k6';
import { getBaseUrl } from '../config/environments.js';
import { auth as endpoints } from './endpoints.js';

const base = () => getBaseUrl();

// Test accounts - create these in DB before running perf tests
const TEST_ACCOUNTS = {
  admin:     { email: __ENV.ADMIN_EMAIL     || 'qa.admin.20260407@gmail.com',     password: __ENV.ADMIN_PASS     || 'Admin@12345!' },
  traveler:  { email: __ENV.TRAVELER_EMAIL  || 'qa.traveler1.20260407@gmail.com', password: __ENV.TRAVELER_PASS  || 'Traveler@12345!' },
  moderator: { email: __ENV.MOD_EMAIL       || 'qa.moderator.20260416@gmail.com', password: __ENV.MOD_PASS       || 'Moderator@12345!' },
};

// Login and return auth context with CSRF token + explicit cookie header
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

  // Extract cookies from response
  const xsrfCookie = res.cookies['XSRF-TOKEN']?.[0];
  const xsrfToken = xsrfCookie ? xsrfCookie.value : '';
  const accessCookie = res.cookies['access_token']?.[0];
  const accessToken = accessCookie ? accessCookie.value : '';

  // Build explicit Cookie header to bypass k6 jar clearing between iterations
  const cookieParts = [];
  if (accessToken) cookieParts.push(`access_token=${accessToken}`);
  if (xsrfToken) cookieParts.push(`XSRF-TOKEN=${xsrfToken}`);

  return {
    xsrfToken,
    accessToken,
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': xsrfToken,
      'Cookie': cookieParts.join('; '),
    },
  };
}

// Headers for CSRF-protected requests (POST, PUT, DELETE)
export function csrfHeaders(ctx) {
  return {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': ctx.xsrfToken,
    'Cookie': ctx.headers['Cookie'],
  };
}

// Headers for auth-only requests (GET, or CSRF-exempt paths like /itineraries/generate)
export function authHeaders(ctx) {
  return {
    'Content-Type': 'application/json',
    'Cookie': ctx.headers['Cookie'],
  };
}

// Refresh token, update CSRF + cookies in context
export function refreshIfNeeded(ctx) {
  const res = http.post(
    `${base()}${endpoints.refreshToken}`,
    null,
    { headers: ctx.headers }
  );

  if (res.status === 200) {
    const xsrfCookie = res.cookies['XSRF-TOKEN']?.[0];
    const accessCookie = res.cookies['access_token']?.[0];
    if (xsrfCookie) {
      ctx.xsrfToken = xsrfCookie.value;
      ctx.headers['X-XSRF-TOKEN'] = ctx.xsrfToken;
    }
    // Rebuild Cookie header with new tokens
    const cookieParts = [];
    if (accessCookie) {
      ctx.accessToken = accessCookie.value;
      cookieParts.push(`access_token=${accessCookie.value}`);
    }
    if (ctx.xsrfToken) cookieParts.push(`XSRF-TOKEN=${ctx.xsrfToken}`);
    ctx.headers['Cookie'] = cookieParts.join('; ');
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
