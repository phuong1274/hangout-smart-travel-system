// Load test - Expense tracking & budget vs actual queries
// Tests: GET /expenses/trip/{id}/budget-vs-actual, POST /expenses

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { heavyApi } from '../../config/thresholds.js';
import { expenses } from '../../lib/endpoints.js';
import { login } from '../../lib/auth.js';
import { randomInt } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  ...tlsOptions,
  scenarios: {
    expenses_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m',  target: 10 },
        { duration: '1m',  target: 5 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: heavyApi,
};

const TRIP_IDS = [1, 2, 3];

// Per-VU login — cookies stay in VU's own jar
let vuCtx = null;

export default function () {
  if (!vuCtx) {
    vuCtx = login('traveler');
    if (!vuCtx) return;
  }

  const tripId = TRIP_IDS[randomInt(0, TRIP_IDS.length - 1)];
  const action = randomInt(1, 4);

  switch (action) {
    case 1: {
      const res = http.get(`${base}${expenses.budgetVsActual(tripId)}`, { headers: vuCtx.headers });
      check(res, { 'budget-vs-actual': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 2: {
      const res = http.get(`${base}${expenses.byTimeline(tripId)}`, { headers: vuCtx.headers });
      check(res, { 'expenses-by-timeline': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 3: {
      const res = http.get(`${base}${expenses.byActivity(tripId)}`, { headers: vuCtx.headers });
      check(res, { 'expenses-by-activity': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 4: {
      const res = http.get(`${base}${expenses.byTrip(tripId)}`, { headers: vuCtx.headers });
      check(res, { 'expenses-list': (r) => r.status === 200 || r.status === 404 });
      break;
    }
  }

  sleep(randomInt(5, 15) / 10);
}
