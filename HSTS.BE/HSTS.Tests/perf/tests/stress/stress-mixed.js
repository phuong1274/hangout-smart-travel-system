// Stress test - Mixed scenario, find system breaking point
// Ramps from 10 to 500 VUs over 10 minutes
// Mix: public browsing + auth + itinerary generation

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl } from '../../config/environments.js';
import { locations, publicLocations, home, itineraries } from '../../lib/endpoints.js';
import { randomInt, buildUrl, randomPagination } from '../../lib/helpers.js';
import { Rate, Trend } from 'k6/metrics';

const base = getBaseUrl();

const errorRate = new Rate('stress_error_rate');
const breakingPointVUs = new Trend('breaking_point_vus');

export const options = {
  scenarios: {
    stress_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 10 },
        { duration: '2m',  target: 50 },
        { duration: '2m',  target: 100 },
        { duration: '2m',  target: 200 },
        { duration: '2m',  target: 500 },
        { duration: '1m',  target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'], // Allow up to 10% errors during stress
    stress_error_rate: ['rate<0.10'],
  },
};

export default function () {
  const action = randomInt(1, 4);

  let res;
  switch (action) {
    case 1:
      res = http.get(`${base}${home.discovery}`);
      break;
    case 2:
      res = http.get(buildUrl(locations.list, randomPagination(20)));
      break;
    case 3:
      res = http.get(buildUrl(publicLocations.list, randomPagination(20)));
      break;
    case 4: {
      // Light itinerary request (only if VUs < 100 to avoid overloading)
      if (__VU < 100) {
        res = http.post(
          `${base}${itineraries.generate}`,
          JSON.stringify({
            originProvinceId: 1,
            destinationProvinceIds: [2],
            startDate: '2026-06-15',
            endDate: '2026-06-16',
            travelerCount: 1,
            budgetAmount: 2000000,
            budgetCurrency: 'VND',
          }),
          { headers: { 'Content-Type': 'application/json' }, timeout: '120s' }
        );
      } else {
        res = http.get(`${base}${home.destinations}`);
      }
      break;
    }
  }

  const ok = res.status >= 200 && res.status < 300;
  errorRate.add(!ok);

  if (!ok && res.status >= 500) {
    console.warn(`Stress test ${res.status} at VU count ~${__VU}`);
  }

  sleep(randomInt(2, 8) / 10);
}
