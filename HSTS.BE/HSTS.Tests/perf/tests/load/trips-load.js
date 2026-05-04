// Load test - Trip management
// Tests: POST /trips/save, GET /trips/{id}/detail, GET /trips/profile/{id}

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { mixedApi } from '../../config/thresholds.js';
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
  thresholds: mixedApi,
};

const TRIP_IDS = [1, 2, 3];
const PROFILE_ID = 4; // traveler user ID

// Login once per VU — cookies passed explicitly via headers
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
      check(res, { 'trip detail': (r) => r.status === 200 || r.status === 403 || r.status === 404 });
      break;
    }
    case 2: {
      const res = http.get(`${base}${trips.byProfile(PROFILE_ID)}`, { headers: vuCtx.headers });
      check(res, { 'trips by profile': (r) => r.status === 200 || r.status === 404 });
      break;
    }
    case 3: {
      const budget = 5000000;
      const res = http.post(
        `${base}${trips.save}`,
        JSON.stringify({
          tripName: `Perf Trip ${Date.now()}`,
          description: 'Load test trip',
          startDate: '2026-06-15',
          endDate: '2026-06-16',
          groupSize: 2,
          currencyCode: 'VND',
          days: [{
            dayNumber: 1,
            date: '2026-06-15',
            dayTitle: 'Day 1',
            weatherSummary: 'Sunny',
            estimatedCost: 2000000,
            activities: [{
              type: 0, // ActivityType.Transport
              title: 'Travel to destination',
              startTime: '08:00:00',
              endTime: '12:00:00',
              transport: {
                transportModeId: 1,
                distanceKm: 300,
                travelTimeMinutes: 240,
              },
              budget: { estimateCost: 500000, title: 'Transport' },
            }],
          }],
          budgetSummary: {
            totalBudget: budget,
            usableBudget: budget,
            estimatedAccommodationCost: 1000000,
            estimatedTransportCost: 500000,
            estimatedActivityCost: 300000,
            estimatedMealCost: 400000,
            estimatedTotalCost: 2200000,
            remainingBudget: 2800000,
          },
        }),
        { headers: vuCtx.headers }
      );
      check(res, { 'save trip': (r) => r.status === 200 || r.status === 201 });
      break;
    }
  }

  sleep(randomInt(5, 15) / 10);
}
