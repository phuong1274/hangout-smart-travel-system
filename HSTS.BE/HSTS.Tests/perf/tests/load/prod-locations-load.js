// Production-safe location load test
// Max 30 VUs, slow ramp, auto-abort on threshold breach
// Usage: ENV=production PROD_URL=https://... k6 run tests/load/prod-locations-load.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { productionSafe } from '../../config/thresholds.js';
import { publicLocations, home } from '../../lib/endpoints.js';
import { randomInt, buildUrl, randomPagination } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  ...tlsOptions,
  scenarios: {
    production_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 5 },
        { duration: '2m',  target: 10 },
        { duration: '2m',  target: 20 },
        { duration: '2m',  target: 30 },
        { duration: '1m',  target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: productionSafe,
};

export default function () {
  const action = randomInt(1, 3);
  let res;

  switch (action) {
    case 1:
      res = http.get(`${base}${home.discovery}`);
      check(res, { 'home/discovery ok': (r) => r.status === 200 });
      break;
    case 2:
      res = http.get(buildUrl(publicLocations.list, randomPagination(5)));
      check(res, { 'public-locations ok': (r) => r.status === 200 });
      break;
    case 3:
      res = http.get(`${base}${home.destinations}`);
      check(res, { 'destinations ok': (r) => r.status === 200 });
      break;
  }

  sleep(randomInt(10, 30) / 10); // Slower think time for prod
}
