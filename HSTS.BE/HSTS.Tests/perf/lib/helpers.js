// Shared utilities for HSTS performance tests

import { sleep } from 'k6';
import { check } from 'k6';
import { getBaseUrl } from '../config/environments.js';

// Random integer between min and max (inclusive)
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random item from array
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build URL with query parameters
export function buildUrl(path, params = {}) {
  const base = getBaseUrl();
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

// Standard pagination params
export function randomPagination(maxPage = 5) {
  return {
    pageNumber: randomInt(1, maxPage),
    pageSize: randomItem([10, 20, 50]),
  };
}

// Standard JSON headers
export function jsonHeaders(xsrfToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken;
  return headers;
}

// Common checks for API responses
export function checkSuccess(res, name = 'request') {
  return check(res, {
    [`${name} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
}

export function checkOk(res, name = 'request') {
  return check(res, {
    [`${name} is 200`]: (r) => r.status === 200,
  });
}

// Realistic think time between actions (1-3 seconds)
export function thinkTime() {
  sleep(randomInt(10, 30) / 10);
}

// Quick pause between rapid requests (0.1-0.5 seconds)
export function quickPause() {
  sleep(randomInt(1, 5) / 10);
}
