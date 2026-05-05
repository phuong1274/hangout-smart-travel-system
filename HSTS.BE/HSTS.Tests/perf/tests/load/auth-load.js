// Load test - Authentication flow
// Tests: POST /api/auth/login, POST /api/auth/refresh-token
// NFR: p95 < 3s, error rate < 1%

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, tlsOptions } from '../../config/environments.js';
import { standardApi } from '../../config/thresholds.js';
import { auth } from '../../lib/endpoints.js';
import { randomInt } from '../../lib/helpers.js';
const base = getBaseUrl();

export const options = {
  ...tlsOptions,
  scenarios: {
    login_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '2m',  target: 10 },
        { duration: '1m',  target: 20 },
        { duration: '1m',  target: 5 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: standardApi,
};

const TEST_EMAIL = __ENV.TRAVELER_EMAIL || 'qa.traveler1.20260407@gmail.com';
const TEST_PASS  = __ENV.TRAVELER_PASS  || 'Traveler@12345!';

export default function () {
  // Login
  const loginRes = http.post(
    `${base}${auth.login}`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, { 'login 200': (r) => r.status === 200 });

  sleep(randomInt(3, 10) / 10);

  // Refresh token — cookies auto-sent by k6 jar
  const refreshRes = http.post(
    `${base}${auth.refreshToken}`,
    null,
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(refreshRes, { 'refresh 200': (r) => r.status === 200 });

  sleep(randomInt(5, 15) / 10);
}
