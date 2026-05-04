// Load test - Admin dashboard (aggregation queries)
// Tests: GET /api/dashboard/summary, trends, insights, queues
// Requires: Admin auth + CSRF

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl } from '../../config/environments.js';
import { heavyApi } from '../../config/thresholds.js';
import { dashboard } from '../../lib/endpoints.js';
import { login, csrfHeaders } from '../../lib/auth.js';
import { randomInt } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  scenarios: {
    dashboard_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '3m',
      gracefulStop: '10s',
    },
  },
  thresholds: heavyApi,
};

export function setup() {
  // Login as admin once in setup
  const ctx = login('admin');
  if (!ctx) throw new Error('Admin login failed - check test account');
  return { ctx };
}

export default function (data) {
  const { ctx } = data;
  const action = randomInt(1, 4);

  let res;
  switch (action) {
    case 1:
      res = http.get(`${base}${dashboard.summary}`, { headers: ctx.headers });
      check(res, { 'dashboard/summary 200': (r) => r.status === 200 });
      break;
    case 2:
      res = http.get(`${base}${dashboard.trends}?months=6`, { headers: ctx.headers });
      check(res, { 'dashboard/trends 200': (r) => r.status === 200 });
      break;
    case 3:
      res = http.get(`${base}${dashboard.insights}`, { headers: ctx.headers });
      check(res, { 'dashboard/insights 200': (r) => r.status === 200 });
      break;
    case 4:
      res = http.get(`${base}${dashboard.queues}`, { headers: ctx.headers });
      check(res, { 'dashboard/queues 200': (r) => r.status === 200 });
      break;
  }

  sleep(randomInt(5, 15) / 10);
}
