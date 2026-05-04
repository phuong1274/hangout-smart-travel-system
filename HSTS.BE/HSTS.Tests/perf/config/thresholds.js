// Shared threshold definitions mapped to HSTS NFRs (PRD Section 4)
// Import and spread into k6 options.thresholds

// Simple API: p95 < 3s, error rate < 1%
export const standardApi = {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'],
  http_req_failed: ['rate<0.01'],
};

// Mixed read/write: endpoints may return 404/403/409 legitimately
// http_req_failed counts non-2xx as errors even when checks pass
export const mixedApi = {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'],
  http_req_failed: ['rate<0.30'],
};

// Heavy operations (dashboard aggregation): p95 < 5s
export const heavyApi = {
  http_req_duration: ['p(95)<5000', 'p(99)<8000'],
  http_req_failed: ['rate<0.01'],
};

// Itinerary generation: p95 < 90s (NFR from PRD)
// External APIs (OSRM + weather) can fail under load
export const itineraryApi = {
  http_req_duration: ['p(95)<90000', 'p(99)<120000'],
  http_req_failed: ['rate<0.50'],
};

// Production-safe: wider thresholds, auto-abort on breach
export const productionSafe = {
  http_req_duration: [{ threshold: 'p(95)<10000', abortOnFail: true }],
  http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true }],
};

// Smoke test: quick sanity check
export const smoke = {
  http_req_duration: ['p(95)<5000'],
  http_req_failed: ['rate<0.20'],
};
