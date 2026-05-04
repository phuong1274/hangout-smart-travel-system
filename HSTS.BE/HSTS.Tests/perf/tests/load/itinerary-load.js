// Load test - Itinerary generation (CPU + external API heavy)
// Tests: POST /api/itineraries/generate
// NFR: p95 < 90s (heavy operation with OSRM + Weather + Transport APIs)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl } from '../../config/environments.js';
import { itineraryApi } from '../../config/thresholds.js';
import { itineraries } from '../../lib/endpoints.js';
import { Trend, Counter } from 'k6/metrics';

const base = getBaseUrl();

// Custom metrics for itinerary breakdown
const itineraryDuration = new Trend('itinerary_gen_duration', true);
const itineraryErrors = new Counter('itinerary_gen_errors');

// Sample itinerary request payload
const ITINERARY_PAYLOADS = [
  {
    originProvinceId: 1,   // Ha Noi
    destinationProvinceIds: [2, 3, 4],
    startDate: '2026-06-15',
    endDate: '2026-06-18',
    travelerCount: 2,
    budgetAmount: 5000000,
    budgetCurrency: 'VND',
    interestTagIds: [1, 2, 3],
  },
  {
    originProvinceId: 1,
    destinationProvinceIds: [5, 6],
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    travelerCount: 4,
    budgetAmount: 10000000,
    budgetCurrency: 'VND',
    interestTagIds: [2, 4],
  },
  {
    originProvinceId: 2,   // Ho Chi Minh
    destinationProvinceIds: [7, 8, 9],
    startDate: '2026-06-20',
    endDate: '2026-06-23',
    travelerCount: 2,
    budgetAmount: 8000000,
    budgetCurrency: 'VND',
    interestTagIds: [1, 3, 5],
  },
];

export const options = {
  scenarios: {
    itinerary_gen: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 2 },
        { duration: '3m',  target: 5 },
        { duration: '2m',  target: 3 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: itineraryApi,
};

export default function () {
  const payload = ITINERARY_PAYLOADS[Math.floor(Math.random() * ITINERARY_PAYLOADS.length)];

  const res = http.post(
    `${base}${itineraries.generate}`,
    JSON.stringify(payload),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '120s', // Allow up to 2 min for itinerary generation
    }
  );

  itineraryDuration.add(res.timings.duration);

  const ok = check(res, {
    'itinerary generated': (r) => r.status === 200,
  });

  if (!ok) {
    itineraryErrors.add(1);
    console.error(`Itinerary failed: ${res.status} - ${res.body?.substring(0, 200)}`);
  }

  sleep(2); // Cool down between heavy requests
}
