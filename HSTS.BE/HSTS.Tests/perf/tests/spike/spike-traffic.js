// Spike test - Sudden traffic burst
// 0 → 200 VUs in 10 seconds, hold 1 min, drop to 10
// Purpose: test sudden traffic burst (e.g., promotional event)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { publicLocations, home } from '../../lib/endpoints.js';
import { randomInt, buildUrl, randomPagination } from '../../lib/helpers.js';
import { Rate } from 'k6/metrics';

const base = getBaseUrl();
const spikeErrorRate = new Rate('spike_error_rate');

export const options = {
  ...tlsOptions,
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },  // Sudden spike
        { duration: '1m',  target: 200 },   // Hold
        { duration: '30s', target: 10 },    // Drop
        { duration: '1m',  target: 10 },    // Sustain low
        { duration: '10s', target: 0 },     // Stop
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    spike_error_rate: ['rate<0.15'],
  },
};

export default function () {
  const action = randomInt(1, 3);
  let res;

  switch (action) {
    case 1:
      res = http.get(`${base}${home.discovery}`);
      break;
    case 2:
      res = http.get(buildUrl(publicLocations.list, randomPagination(10)));
      break;
    case 3:
      res = http.get(`${base}${home.destinations}`);
      break;
  }

  spikeErrorRate.add(res.status >= 500);
  check(res, { 'spike request ok': (r) => r.status < 500 });

  sleep(randomInt(1, 5) / 10);
}
