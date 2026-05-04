// Load test - Location browsing (public + admin)
// Tests: GET /api/locations, GET /api/public-locations, GET /api/locations/{id}
// NFR: p95 < 3s, error rate < 1%

import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, getBaseUrl, tlsOptions } from '../../config/environments.js';
import { standardApi } from '../../config/thresholds.js';
import { locations, publicLocations, home } from '../../lib/endpoints.js';
import { randomInt, buildUrl, randomPagination, checkOk } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  ...tlsOptions,
  scenarios: {
    public_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '2m',  target: 10 },
        { duration: '30s', target: 30 },
        { duration: '2m',  target: 30 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: standardApi,
};

// Sample location IDs - update after seeding data
const LOCATION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function () {
  const page = randomPagination(10);

  // Mix of public browsing patterns
  const action = randomInt(1, 5);

  switch (action) {
    case 1: {
      // Public locations list
      const res = http.get(buildUrl(publicLocations.list, page));
      checkOk(res, 'public-locations list');
      break;
    }
    case 2: {
      // Admin locations list (anonymous, returns public data)
      const res = http.get(buildUrl(locations.list, page));
      checkOk(res, 'locations list');
      break;
    }
    case 3: {
      // Location detail
      const id = LOCATION_IDS[randomInt(0, LOCATION_IDS.length - 1)];
      const res = http.get(`${base}${publicLocations.detail(id)}`);
      checkOk(res, `location detail ${id}`);
      break;
    }
    case 4: {
      // Home discovery
      const res = http.get(`${base}${home.discovery}`);
      checkOk(res, 'home discovery');
      break;
    }
    case 5: {
      // Destinations
      const res = http.get(`${base}${home.destinations}`);
      checkOk(res, 'destinations');
      break;
    }
  }

  sleep(randomInt(5, 15) / 10);
}
