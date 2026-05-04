// Environment profiles for HSTS performance testing
// Usage: ENV=local-dev k6 run tests/load/locations-load.js

const env = __ENV.ENV || 'local-dev';

const environments = {
  'local-dev': {
    baseUrl: 'https://localhost:7139/api',
    maxVUs: 50,
    rateLimit: { window: '10s', maxRequests: 90 },
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      http_req_failed: ['rate<0.01'],
    },
  },
  'production-sim': {
    baseUrl: 'http://localhost:7140/api', // proxied through Toxiproxy
    maxVUs: 500,
    rateLimit: { window: '10s', maxRequests: 90 },
    thresholds: {
      http_req_duration: ['p(95)<5000'],
      http_req_failed: ['rate<0.02'],
    },
  },
  production: {
    baseUrl: __ENV.PROD_URL || 'https://hangout.io.vn/api',
    maxVUs: 50,
    rateLimit: { window: '10s', maxRequests: 80 },
    thresholds: {
      http_req_duration: ['p(95)<10000'],
      http_req_failed: ['rate<0.05'],
    },
  },
};

export const config = environments[env] || environments['local-dev'];
export const getBaseUrl = () => config.baseUrl;

// TLS: skip verify for local self-signed certs
export const tlsOptions = {
  insecureSkipTLSVerify: true,
};

export default config;

// Network profiles for Toxiproxy simulation
export const networkProfiles = {
  'slow-3g':    { bandwidth: 50,    latency: 2000, jitter: 100, loss: 1.0 },    // ~400kbps
  'fast-3g':    { bandwidth: 200,   latency: 562,  jitter: 50,  loss: 0.5 },    // ~1.6Mbps
  '4g-lte':     { bandwidth: 1500,  latency: 70,   jitter: 10,  loss: 0.1 },    // ~12Mbps
  'wifi':       { bandwidth: 3750,  latency: 20,   jitter: 5,   loss: 0 },      // ~30Mbps
  'lan':        { bandwidth: 12500, latency: 2,    jitter: 1,   loss: 0 },      // ~100Mbps
  'production': { bandwidth: 1250,  latency: 50,   jitter: 20,  loss: 0.1 },    // ~10Mbps
};

// Docker resource profiles
export const resourceProfiles = {
  'low-end':    { cpu: '0.5',  memory: '256m',  desc: 'Budget VPS (1 vCPU, 512MB total)' },
  'mid-range':  { cpu: '1.0',  memory: '512m',  desc: 'Standard VPS (2 vCPU, 1GB total)' },
  'production': { cpu: '2.0',  memory: '1024m', desc: 'Production server (4 vCPU, 2GB total)' },
  'unlimited':  { cpu: '0',    memory: '0',     desc: 'No limits (developer machine)' },
};
