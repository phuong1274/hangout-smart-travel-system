// Production-safe auth load test
// Max 10 VUs, very slow ramp
// Usage: ENV=production PROD_URL=https://... k6 run tests/load/prod-auth-load.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl } from '../../config/environments.js';
import { productionSafe } from '../../config/thresholds.js';
import { auth } from '../../lib/endpoints.js';
import { randomInt } from '../../lib/helpers.js';

const base = getBaseUrl();

export const options = {
  scenarios: {
    production_auth: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 3 },
        { duration: '2m',  target: 5 },
        { duration: '2m',  target: 10 },
        { duration: '1m',  target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: productionSafe,
};

const TEST_EMAIL = __ENV.TRAVELER_EMAIL || 'perf-traveler@test.com';
const TEST_PASS  = __ENV.TRAVELER_PASS  || 'PerfTest123!';

export default function () {
  const res = http.post(
    `${base}${auth.login}`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, { 'login ok': (r) => r.status === 200 });

  sleep(randomInt(10, 30) / 10);
}
