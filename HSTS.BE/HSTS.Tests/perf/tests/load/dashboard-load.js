// Load test - Admin dashboard (aggregation queries)
// Tests: GET /api/dashboard/summary, trends, insights, queues
// Requires: Admin auth + CSRF

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { heavyApi } from '../../config/thresholds.js';
import { dashboard } from '../../lib/endpoints.js';
import { login } from '../../lib/auth.js';
import { randomInt } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  ...tlsOptions,
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

// Per-VU login — cookies stay in VU's own jar
let vuCtx = null;

export default function () {
  if (!vuCtx) {
    vuCtx = login('admin');
    if (!vuCtx) return;
  }

  const action = randomInt(1, 4);

  let res;
  switch (action) {
    case 1:
      res = http.get(`${base}${dashboard.summary}`, { headers: vuCtx.headers });
      check(res, { 'dashboard/summary 200': (r) => r.status === 200 });
      break;
    case 2:
      res = http.get(`${base}${dashboard.trends}?months=6`, { headers: vuCtx.headers });
      check(res, { 'dashboard/trends 200': (r) => r.status === 200 });
      break;
    case 3:
      res = http.get(`${base}${dashboard.insights}`, { headers: vuCtx.headers });
      check(res, { 'dashboard/insights 200': (r) => r.status === 200 });
      break;
    case 4:
      res = http.get(`${base}${dashboard.queues}`, { headers: vuCtx.headers });
      check(res, { 'dashboard/queues 200': (r) => r.status === 200 });
      break;
  }

  sleep(randomInt(5, 15) / 10);
}
