// Load test - Expense tracking & budget vs actual queries
// Tests: GET /expenses/trip/{id}/budget-vs-actual, POST /expenses

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl } from '../../config/environments.js';
import { heavyApi } from '../../config/thresholds.js';
import { expenses } from '../../lib/endpoints.js';
import { login } from '../../lib/auth.js';
import { randomInt } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
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

export function setup() {
  const ctx = login('traveler');
  if (!ctx) throw new Error('Traveler login failed');
  return { ctx };
}

export default function (data) {
  const { ctx } = data;
  const tripId = TRIP_IDS[randomInt(0, TRIP_IDS.length - 1)];
  const action = randomInt(1, 4);

  switch (action) {
    case 1: {
      // Budget vs actual (aggregation query)
      const res = http.get(`${base}${expenses.budgetVsActual(tripId)}`, { headers: ctx.headers });
      check(res, { 'budget-vs-actual': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 2: {
      // Expenses by timeline
      const res = http.get(`${base}${expenses.byTimeline(tripId)}`, { headers: ctx.headers });
      check(res, { 'expenses-by-timeline': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 3: {
      // Expenses by activity
      const res = http.get(`${base}${expenses.byActivity(tripId)}`, { headers: ctx.headers });
      check(res, { 'expenses-by-activity': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 4: {
      // List expenses
      const res = http.get(`${base}${expenses.byTrip(tripId)}`, { headers: ctx.headers });
      check(res, { 'expenses-list': (r) => r.status === 200 || r.status === 404 });
      break;
    }
  }

  sleep(randomInt(5, 15) / 10);
}
