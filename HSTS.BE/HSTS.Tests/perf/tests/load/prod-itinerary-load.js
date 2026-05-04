// Production-safe itinerary load test
// Max 5 VUs (CPU-heavy), very slow ramp
// Usage: ENV=production PROD_URL=https://... k6 run tests/load/prod-itinerary-load.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { productionSafe } from '../../config/thresholds.js';
import { itineraries } from '../../lib/endpoints.js';
import { randomInt } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  ...tlsOptions,
  scenarios: {
    production_itinerary: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 1 },
        { duration: '2m',  target: 3 },
        { duration: '2m',  target: 5 },
        { duration: '1m',  target: 0 },
      ],
      gracefulRampDown: '60s',
    },
  },
  thresholds: {
    http_req_duration: [{ threshold: 'p(95)<120000', abortOnFail: true }],
    http_req_failed: [{ threshold: 'rate<0.50', abortOnFail: true }],
  },
};

export default function () {
  const res = http.post(
    `${base}${itineraries.generate}`,
    JSON.stringify({
      request: {
        userLocation: { latitude: 21.02, longitude: 105.78 },
        destinations: [{ provinceId: 24 }],
        currencyCode: 'VND',
        groupSize: 2,
        totalBudget: 5000000,
        startDate: '2026-06-15',
        endDate: '2026-06-16',
        tripSegment: 'Standard',
      },
    }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '180s' }
  );

  check(res, { 'itinerary ok': (r) => r.status === 200 });

  sleep(randomInt(15, 30) / 10);
}
