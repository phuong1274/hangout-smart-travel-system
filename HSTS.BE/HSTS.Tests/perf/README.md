# HSTS Performance Test Suite (k6)

Performance testing suite for HSTS graduation project using k6. Covers load, stress, spike, and soak tests with configurable environment profiles and resource throttling.

## Quick Start

```bash
cd HSTS.BE/HSTS.Tests/perf

# 1. Start backend API first
#    dotnet run --project HSTS.API (from HSTS.BE/)

# 2. Run smoke test (1 VU, ~30s)
k6 run tests/smoke/smoke.js

# 3. Run load test with HTML report
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=reports/locations.html \
  k6 run tests/load/locations-load.js

# 4. Run all tests sequentially
./scripts/run-all.sh local-dev

# 5. Run production test (safe, max 30 VUs)
export PROD_URL=https://your-app.onrender.com/api
./scripts/run-production.sh locations-load
```

## Prerequisites

- **k6** installed (`choco install k6` on Windows)
- **Backend API** running (local or production URL)
- **Docker Desktop** (optional, for CPU/RAM throttling)
- **Test accounts** in database:
  - `perf-traveler@test.com` / `PerfTest123!`
  - `perf-admin@test.com` / `PerfTest123!`
  - `perf-mod@test.com` / `PerfTest123!`

Override accounts via env vars: `TEST_TRAVELER_EMAIL`, `TEST_TRAVELER_PASSWORD`, etc.

## All Tests

| Test | Command | VUs | Duration | Purpose |
|------|---------|-----|----------|---------|
| Smoke | `k6 run tests/smoke/smoke.js` | 1 | 30s | Sanity check 6 endpoints |
| Locations Load | `k6 run tests/load/locations-load.js` | 10→30 | 5min | Public browsing patterns |
| Auth Load | `k6 run tests/load/auth-load.js` | 5→20 | 4min | Login + token refresh |
| Itinerary Load | `k6 run tests/load/itinerary-load.js` | 2→5 | 5min | CPU-heavy generation (OSRM+Weather) |
| Dashboard Load | `k6 run tests/load/dashboard-load.js` | 5 | 3min | Admin aggregation queries |
| Reviews Load | `k6 run tests/load/reviews-load.js` | 5→20 | 5min | 70% read / 30% write mix |
| Trips Load | `k6 run tests/load/trips-load.js` | 5→15 | 4min | Authenticated trip operations |
| Expenses Load | `k6 run tests/load/expenses-load.js` | 5→10 | 3min | Budget vs actual queries |
| Stress Mixed | `k6 run tests/stress/stress-mixed.js` | 10→500 | 10min | Find breaking point |
| Spike Traffic | `k6 run tests/spike/spike-traffic.js` | 0→200 | 3min | Sudden traffic burst |
| Soak Endurance | `k6 run tests/soak/soak-endurance.js` | 20 | 30min | Memory leak / stability |

### npm Shortcuts

```bash
npm run smoke           # Quick smoke test
npm run load:locations  # Locations load test
npm run load:auth       # Auth load test
npm run load:itinerary  # Itinerary load test
npm run load:dashboard  # Dashboard load test
npm run load:reviews    # Reviews load test
npm run load:trips      # Trips load test
npm run load:expenses   # Expenses load test
npm run stress          # Stress test (10→500 VUs)
npm run spike           # Spike test (0→200 VUs)
npm run soak            # Soak test (30 min)
npm run report:all      # Run all tests with reports
```

## Environment Profiles

| Profile | ENV Variable | Target | Max VUs | Threshold |
|---------|-------------|--------|---------|-----------|
| **Local Dev** | `ENV=local-dev` | `localhost:7139` | 500 | p95<3s, errors<1% |
| **Production Sim** | `ENV=production-sim` | `localhost:7139` | 100 | p95<5s, errors<2% |
| **Production** | `ENV=production` | `$PROD_URL` | 50 | p95<10s, errors<5% |

```bash
# Default is local-dev
k6 run tests/load/locations-load.js

# Simulate production on local
ENV=production-sim k6 run tests/load/locations-load.js

# Run against real production
ENV=production PROD_URL=https://your-app.onrender.com/api \
  k6 run tests/load/prod-locations-load.js
```

## Reports

### HTML Report (auto-generated)

```bash
K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT=reports/test-report.html \
k6 run tests/load/locations-load.js
```

Open `reports/test-report.html` in any browser — self-contained, no server needed.

### Thesis Report (NFR compliance)

Each test script includes `handleSummary()` that generates:
- NFR compliance table (PASS/FAIL per criterion)
- Metrics summary (p50, p95, p99, RPS, error rate)
- Color-coded HTML report

Reports are saved to `reports/` directory (gitignored).

### Run All Tests with Reports

```bash
./scripts/run-all.sh local-dev
# Generates: reports/all-YYYYMMDD-HHMMSS/<test>.html + <test>-summary.json
```

## Resource Throttling (Docker)

Simulate production hardware constraints locally.

### CPU + RAM Limits

```bash
# Start API + MySQL + Toxiproxy with limits
CPU_LIMIT=1.0 MEMORY_LIMIT=512m \
  docker compose -f docker/docker-compose.perf.yml up -d

# Available resource profiles:
#   low-end:    CPU 0.5, RAM 256MB  (budget VPS)
#   mid-range:  CPU 1.0, RAM 512MB  (standard VPS)
#   production: CPU 2.0, RAM 1024MB (production server)
#   unlimited:  no limits (developer machine)
```

### Network Throttling (Toxiproxy)

```bash
# Apply network profile (requires Docker stack running)
./scripts/setup-throttling.sh slow-3g    # 400kbps, 2000ms latency
./scripts/setup-throttling.sh fast-3g    # 1.6Mbps, 562ms latency
./scripts/setup-throttling.sh 4g-lte     # 12Mbps, 70ms latency
./scripts/setup-throttling.sh wifi       # 30Mbps, 20ms latency
./scripts/setup-throttling.sh lan        # 100Mbps, 2ms latency
./scripts/setup-throttling.sh production # 10Mbps, 50ms latency
./scripts/setup-throttling.sh clear      # Remove all throttling
```

### Full Simulation Example

```bash
# 1. Start throttled environment
CPU_LIMIT=1.0 MEMORY_LIMIT=512m \
  docker compose -f docker/docker-compose.perf.yml up -d

# 2. Apply 4G network profile
./scripts/setup-throttling.sh 4g-lte

# 3. Run tests against throttled environment
ENV=production-sim k6 run tests/load/locations-load.js

# 4. Cleanup
./scripts/setup-throttling.sh clear
docker compose -f docker/docker-compose.perf.yml down
```

## Production Testing

Production tests have safety guards: lower VU counts, slower ramp-up, auto-abort on threshold breach.

```bash
# Set production URL
export PROD_URL=https://your-app.onrender.com/api

# Run production-safe test
./scripts/run-production.sh locations-load    # Max 30 VUs
./scripts/run-production.sh auth-load         # Max 10 VUs
./scripts/run-production.sh itinerary-load    # Max 5 VUs

# Or run directly
ENV=production PROD_URL=$PROD_URL \
  k6 run tests/load/prod-locations-load.js
```

### Safety Features

- Max 50 VUs (never exceed)
- Slow ramp-up: 1 → 5 → 10 → 20 → 30 VUs over 8 minutes
- Auto-abort if p95 > 10s or error rate > 5%
- Rate limit aware: stays under 100 req/10s
- Max 10 minutes per test
- No soak test on production

## NFR Targets (from PRD)

| Metric | Target | Threshold in k6 |
|--------|--------|-----------------|
| Simple API response | < 3s | `p(95)<3000` |
| Itinerary generation | < 90s | `p(95)<90000` |
| Error rate | < 1% | `rate<0.01` |
| Concurrent users | 1,000-3,000 | Stress test validates |

## Configuration Override

All settings can be overridden via environment variables:

```bash
# Custom base URL
BASE_URL=https://staging.example.com/api k6 run tests/smoke/smoke.js

# Custom test account
TEST_TRAVELER_EMAIL=user@example.com TEST_TRAVELER_PASSWORD=MyPass123 \
  k6 run tests/load/auth-load.js

# Custom thresholds (edit config/thresholds.js)
# Custom endpoints (edit lib/endpoints.js)
```

## Project Structure

```
perf/
├── config/
│   ├── environments.js      # 3 profiles (local-dev/production-sim/production)
│   └── thresholds.js        # NFR-mapped k6 threshold presets
├── lib/
│   ├── auth.js              # Login + CSRF (XSRF-TOKEN) handling
│   ├── endpoints.js         # All API route constants
│   ├── helpers.js           # Shared utilities (pagination, think time)
│   └── report.js            # Thesis HTML report generator
├── tests/
│   ├── smoke/smoke.js       # Sanity check (1 VU, 6 endpoints)
│   ├── load/                # Load tests per domain
│   ├── stress/              # Mixed stress (find breaking point)
│   ├── spike/               # Sudden burst simulation
│   └── soak/                # Long-running endurance
├── docker/                  # Docker stack with resource limits
├── scripts/                 # Runner scripts (throttling, production, all)
├── reports/                 # Generated HTML + JSON reports (gitignored)
└── package.json             # npm shortcuts
```
