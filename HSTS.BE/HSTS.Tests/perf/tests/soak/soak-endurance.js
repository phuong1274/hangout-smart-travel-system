// Soak test - Long-running stability (30 min)
// 20 VUs sustained, monitors for memory leaks and degradation
// Mix of all operations

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl } from '../../config/environments.js';
import { standardApi } from '../../config/thresholds.js';
import { locations, publicLocations, home } from '../../lib/endpoints.js';
import { login } from '../../lib/auth.js';
import { randomInt, buildUrl, randomPagination } from '../../lib/helpers.js';
import { Trend } from 'k6/metrics';

const base = getBaseUrl();

// Track response time over time to detect degradation
const responseTimeTrend = new Trend('soak_response_time', true);

export const options = {
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

export function setup() {
  // Login as traveler for authenticated operations
  const ctx = login('traveler');
  return { ctx };
}

export default function (data) {
  const { ctx } = data;
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
      // Authenticated request - check user profile
      if (ctx) {
        res = http.get(`${base}/users/me`, { headers: ctx.headers });
      } else {
        res = http.get(`${base}${home.discovery}`);
      }
      break;
  }

  responseTimeTrend.add(res.timings.duration);
  check(res, { 'soak request ok': (r) => r.status < 500 });

  sleep(randomInt(5, 20) / 10); // Realistic think time
}
