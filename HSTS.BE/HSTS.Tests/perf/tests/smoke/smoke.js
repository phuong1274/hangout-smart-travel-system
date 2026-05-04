// Smoke test - quick sanity check of key HSTS endpoints
// Usage: k6 run tests/smoke/smoke.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { smoke } from '../../config/thresholds.js';
import { getBaseUrl } from '../../config/environments.js';
import { home, locations, publicLocations } from '../../lib/endpoints.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: smoke,
};

const base = getBaseUrl();

export default function () {
  // 1. Home discovery
  const homeRes = http.get(`${base}${home.discovery}`);
  check(homeRes, { 'home/discovery 200': (r) => r.status === 200 });

  // 2. Home destinations
  const destRes = http.get(`${base}${home.destinations}`);
  check(destRes, { 'home/destinations 200': (r) => r.status === 200 });

  // 3. Public locations list
  const pubLocRes = http.get(`${base}${publicLocations.list}?pageNumber=1&pageSize=5`, { headers: { 'Accept': 'application/json' } });
  check(pubLocRes, { 'public-locations 200': (r) => r.status === 200 });

  // 4. Admin locations list (anonymous, should still return public data)
  const locRes = http.get(`${base}${locations.list}?pageNumber=1&pageSize=5`);
  check(locRes, { 'locations list 200': (r) => r.status === 200 });

  // 5. Tags list
  const tagRes = http.get(`${base}/tags?pageNumber=1&pageSize=10`);
  check(tagRes, { 'tags list 200': (r) => r.status === 200 });

  // 6. Amenities list
  const amenRes = http.get(`${base}/amenities?pageNumber=1&pageSize=10`);
  check(amenRes, { 'amenities list 200': (r) => r.status === 200 });

  sleep(1);
}
