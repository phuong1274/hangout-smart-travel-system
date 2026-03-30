# Docker Deployment Guide

This guide covers deploying HSTS using Docker Compose for both test and production environments. Public HTTPS access is provided by [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — no manual SSL certificate configuration required.

---

## Prerequisites

- Docker ≥ 24 (`docker --version`)
- Docker Compose v2 (`docker compose version`)
- `curl` installed on the host (used by backend healthcheck)

---

## Docker-related files

```
hangout-smart-travel-system/
├── .env.example              ← copy to .env and fill in secrets
├── docker-compose.prod.yml   ← production (isolated networks, no MySQL port)
├── docker-compose.test.yml   ← test/staging (MySQL port exposed for team)
├── HSTS.BE/
│   └── Dockerfile            ← .NET 8 multi-stage build
└── HSTS.FE/
    ├── Dockerfile            ← Node 20 + nginx multi-stage build
    └── nginx.conf            ← SPA serving + /api proxy config
```

---

## 1. Environment Setup

```bash
cp .env.example .env
```

Open `.env` and fill in all values. Key notes:

| Variable | Note |
|----------|------|
| `JWT_SECRET_KEY` | Minimum 32 characters |
| `CORS_ALLOWED_ORIGIN` | `https://hangout.io.vn` for prod; your domain/IP for test |
| `GOOGLE_CLIENT_ID` | Must match `VITE_GOOGLE_OAUTH_CLIENT_ID` exactly |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | Must match `GOOGLE_CLIENT_ID` exactly |
| `RESEND_API_KEY` | Resend API key for transactional OTP delivery |
| `RESEND_FROM_EMAIL` | Verified sender email/domain configured in Resend |
| `VITE_API_BASE_URL` | Leave empty — axios uses relative paths via nginx |
| `MYSQL_EXPOSED_PORT` | Default `3307` avoids conflict with local MySQL on port 3306 |

---

## 2. First-time Database Setup (Migrations)

The `aspnet:8.0` runtime image does not include the .NET SDK or `dotnet-ef`. Run migrations using a temporary SDK container connected to the MySQL container's network.

**Test environment** (MySQL is on `app-net`):
```bash
docker compose -f docker-compose.test.yml up -d mysql
# Wait for MySQL to be healthy (check: docker compose -f docker-compose.test.yml ps)

docker run --rm \
  --network hangout-smart-travel-system_app-net \
  -v "$(pwd)/HSTS.BE:/src" \
  -w /src \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet ef database update \
    --project HSTS.Infrastructure \
    --startup-project HSTS.API \
    -- \
    ConnectionStrings:DefaultConnection="Server=mysql;Port=3306;Database=hsts_db;User=hsts_user;Password=<your-password>;"
```

**Production environment** (MySQL is on `db-net`):
```bash
docker compose -f docker-compose.prod.yml up -d mysql
# Wait for MySQL healthcheck to pass

docker run --rm \
  --network hangout-smart-travel-system_db-net \
  -v "$(pwd)/HSTS.BE:/src" \
  -w /src \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet ef database update \
    --project HSTS.Infrastructure \
    --startup-project HSTS.API \
    -- \
    ConnectionStrings:DefaultConnection="Server=mysql;Port=3306;Database=hsts_db;User=hsts_user;Password=<your-password>;"
```

> The network name is `<compose-project-name>_<network-name>`. Docker Compose uses the directory name as the project name by default. Check with `docker network ls` if unsure.

---

## 3. Running the Test Environment

```bash
docker compose -f docker-compose.test.yml up -d --build
```

- Frontend: `http://localhost`
- Backend Swagger UI: `http://localhost/api/swagger` (Development mode)
- MySQL (direct access): `localhost:3307` (or whichever `MYSQL_EXPOSED_PORT` you set)

Stop:
```bash
docker compose -f docker-compose.test.yml down
```

Stop and remove volumes (wipes DB data):
```bash
docker compose -f docker-compose.test.yml down -v
```

---

## 4. Running the Production Environment

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The stack is now running on port 80. Point Cloudflare Tunnel at `http://localhost:80` (see Section 5).

Stop:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 5. Cloudflare Tunnel Setup

Cloudflare Tunnel handles HTTPS termination for `hangout.io.vn` — no SSL certificates needed on the server.

1. Go to [Cloudflare Zero Trust dashboard](https://one.cloudflare.com/) → **Networks** → **Tunnels**
2. Create a new tunnel, install and run the connector on your server (follow Cloudflare's instructions)
3. Add a **Public Hostname** route:
   - **Subdomain/Domain:** `hangout.io.vn`
   - **Service type:** `HTTP`
   - **URL:** `localhost:80`
4. Save. Traffic to `https://hangout.io.vn` now routes to your nginx container.

---

## 6. Troubleshooting

### Backend container keeps restarting
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=50
```
Most common cause: missing or incorrect env var (e.g. wrong DB credentials, JWT key too short).

### DB connection refused
Check that MySQL is healthy before the backend starts:
```bash
docker compose -f docker-compose.prod.yml ps
```
If MySQL shows `unhealthy`, check MySQL logs:
```bash
docker compose -f docker-compose.prod.yml logs mysql --tail=30
```

### 502 Bad Gateway on `/api/` (test env)
In `docker-compose.test.yml`, nginx starts without waiting for the backend. Wait ~30–60 seconds for the backend to fully initialize, then retry.

### FE 404 on hard refresh (e.g. `/dashboard`)
nginx's `try_files $uri $uri/ /index.html` must be in place. Verify `HSTS.FE/nginx.conf` has this directive in the `/` location block.

### CORS errors in browser console
`CORS_ALLOWED_ORIGIN` in `.env` must exactly match the origin the browser uses (including scheme and port). For production: `https://hangout.io.vn`. For local test behind Cloudflare: your tunnel domain.

### Rebuilding after code changes
Frontend VITE_ variables are baked into the build — changing them requires a rebuild:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
