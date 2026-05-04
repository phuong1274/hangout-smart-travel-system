// Soak test - Long-running stability (30 min)
// 20 VUs sustained, monitors for memory leaks and degradation
// Mix of all operations

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { locations, publicLocations, home } from '../../lib/endpoints.js';
import { login, refreshIfNeeded } from '../../lib/auth.js';
import { randomInt, buildUrl, randomPagination } from '../../lib/helpers.js';
import { Trend } from 'k6/metrics';

const base = getBaseUrl();

// Track response time over time to detect degradation
const responseTimeTrend = new Trend('soak_response_time', true);

export const options = {
  ...tlsOptions,
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30m',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.02'],
  },
};

// Per-VU login — cookies stay in VU's own jar
let vuCtx = null;

export default function () {
  // Login on first iteration or re-login if context lost
  if (!vuCtx) {
    vuCtx = login('traveler');
    if (!vuCtx) {
      sleep(5);
      return;
    }
  }

  const action = randomInt(1, 5);
  let res;

  switch (action) {
    case 1:
      res = http.get(`${base}${home.discovery}`);
      break;
    case 2:
      res = http.get(buildUrl(publicLocations.list, randomPagination(10)));
      break;
    case 3:
      res = http.get(buildUrl(locations.list, randomPagination(10)));
      break;
    case 4:
      res = http.get(`${base}${home.destinations}`);
      break;
    case 5:
      res = http.get(`${base}/users/me`, { headers: vuCtx.headers });
      // Re-login on 401 (token expired)
      if (res.status === 401) {
        vuCtx = login('traveler');
        if (!vuCtx) { sleep(5); return; }
        res = http.get(`${base}/users/me`, { headers: vuCtx.headers });
      }
      break;
  }

  responseTimeTrend.add(res.timings.duration);
  check(res, { 'soak request ok': (r) => r.status < 500 });

  sleep(randomInt(5, 20) / 10);
}
