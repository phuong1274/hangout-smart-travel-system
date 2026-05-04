// Load test - Trip management
// Tests: POST /trips/save, GET /trips/{id}/detail, GET /trips/profile/{id}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { standardApi } from '../../config/thresholds.js';
import { trips } from '../../lib/endpoints.js';
import { login } from '../../lib/auth.js';
import { randomInt, checkOk } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  ...tlsOptions,
  scenarios: {
    trips_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m',  target: 10 },
        { duration: '1m',  target: 15 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: standardApi,
};

const TRIP_IDS = [1, 2, 3];
const PROFILE_ID = 1;

// Per-VU login — cookies stay in VU's own jar
let vuCtx = null;

export default function () {
  if (!vuCtx) {
    vuCtx = login('traveler');
    if (!vuCtx) return;
  }

  const action = randomInt(1, 3);

  switch (action) {
    case 1: {
      const tripId = TRIP_IDS[randomInt(0, TRIP_IDS.length - 1)];
      const res = http.get(`${base}${trips.detail(tripId)}`, { headers: vuCtx.headers });
      check(res, { 'trip detail': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 2: {
      const res = http.get(`${base}${trips.byProfile(PROFILE_ID)}`, { headers: vuCtx.headers });
      check(res, { 'trips by profile': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 3: {
      const res = http.post(
        `${base}${trips.save}`,
        JSON.stringify({
          name: `Perf Test Trip ${Date.now()}`,
          startDate: '2026-06-15',
          endDate: '2026-06-18',
          originProvinceId: 1,
          travelerCount: 2,
          budgetAmount: 5000000,
          budgetCurrency: 'VND',
          days: [],
        }),
        { headers: vuCtx.headers }
      );
      check(res, { 'save trip': (r) => r.status === 200 || r.status === 201 });
      break;
    }
  }

  sleep(randomInt(5, 15) / 10);
}
