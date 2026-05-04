// Load test - Reviews (read + write mix)
// Tests: GET reviews by location, POST create review
// 70% read / 30% write ratio

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { standardApi } from '../../config/thresholds.js';
import { reviews } from '../../lib/endpoints.js';
import { login } from '../../lib/auth.js';
import { randomInt, buildUrl, randomPagination, checkOk } from '../../lib/helpers.js';

const base = getBaseUrl();

const LOCATION_IDS = [1, 2, 3, 4, 5];

export const options = {
  ...tlsOptions,
  scenarios: {
    reviews_mixed: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m',  target: 10 },
        { duration: '1m',  target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: standardApi,
};

// Per-VU login — cookies stay in VU's own jar
let vuCtx = null;

export default function () {
  if (!vuCtx) {
    vuCtx = login('traveler');
    if (!vuCtx) return;
  }

  const locationId = LOCATION_IDS[randomInt(0, LOCATION_IDS.length - 1)];
  const isRead = Math.random() < 0.7; // 70% reads

  if (isRead) {
    // Read reviews — public, no auth needed
    const page = randomPagination(5);
    const res = http.get(buildUrl(reviews.byLocation(locationId), page));
    checkOk(res, `reviews for location ${locationId}`);
  } else {
    // Check eligibility then create review
    const eligRes = http.get(
      `${base}${reviews.eligibility(locationId)}`,
      { headers: vuCtx.headers }
    );

    if (eligRes.status === 200) {
      const rating = randomInt(3, 5);
      const res = http.post(
        `${base}${reviews.create}`,
        JSON.stringify({
          locationId,
          rating,
          comment: `Performance test review ${Date.now()}`,
        }),
        { headers: vuCtx.headers }
      );
      check(res, { 'review created': (r) => r.status === 200 || r.status === 201 || r.status === 409 });
    }
  }

  sleep(randomInt(5, 15) / 10);
}
