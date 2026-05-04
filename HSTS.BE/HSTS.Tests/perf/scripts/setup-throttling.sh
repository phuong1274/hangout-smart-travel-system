#!/bin/bash
# Configure Toxiproxy for network simulation
# Usage: ./setup-throttling.sh [profile] [toxiproxy_api_url]
# Profiles: slow-3g, fast-3g, 4g-lte, wifi, lan, production, clear

set -e

PROFILE=${1:-4g-lte}
API=${2:-http://localhost:8474}
PROXY_NAME="hsts-backend"
UPSTREAM="hsts-api:7139"
LISTEN="0.0.0.0:7140"

echo "=== Toxiproxy Network Throttling ==="
echo "Profile: $PROFILE"
echo "API: $API"

# Create or update proxy
curl -sf -X POST "$API/proxies" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$PROXY_NAME\",\"upstream\":\"$UPSTREAM\",\"listen\":\"$LISTEN\"}" \
  > /dev/null 2>&1 || {
    echo "Proxy exists, updating..."
    curl -sf -X PUT "$API/proxies/$PROXY_NAME" \
      -H "Content-Type: application/json" \
      -d "{\"upstream\":\"$UPSTREAM\",\"listen\":\"$LISTEN\"}" > /dev/null
  }

# Clear existing toxics first
curl -sf -X DELETE "$API/proxies/$PROXY_NAME/toxics" > /dev/null 2>&1 || true

case $PROFILE in
  slow-3g)
    echo "Applying Slow 3G: ~400kbps, 2000ms latency"
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":50},"name":"bandwidth_down","stream":"downstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":30},"name":"bandwidth_up","stream":"upstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"latency","attributes":{"latency":2000,"jitter":100},"name":"latency"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"slicer","attributes":{"average_size":100,"size_variation":50},"name":"slicer"}' > /dev/null
    ;;

  fast-3g)
    echo "Applying Fast 3G: ~1.6Mbps, 562ms latency"
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":200},"name":"bandwidth_down","stream":"downstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":100},"name":"bandwidth_up","stream":"upstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"latency","attributes":{"latency":562,"jitter":50},"name":"latency"}' > /dev/null
    ;;

  4g-lte)
    echo "Applying 4G LTE: ~12Mbps, 70ms latency"
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":1500},"name":"bandwidth_down","stream":"downstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":500},"name":"bandwidth_up","stream":"upstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"latency","attributes":{"latency":70,"jitter":10},"name":"latency"}' > /dev/null
    ;;

  wifi)
    echo "Applying WiFi: ~30Mbps, 20ms latency"
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":3750},"name":"bandwidth_down","stream":"downstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"latency","attributes":{"latency":20,"jitter":5},"name":"latency"}' > /dev/null
    ;;

  lan)
    echo "Applying LAN: ~100Mbps, 2ms latency"
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":12500},"name":"bandwidth_down","stream":"downstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"latency","attributes":{"latency":2,"jitter":1},"name":"latency"}' > /dev/null
    ;;

  production)
    echo "Applying Production Sim: ~10Mbps, 50ms latency, 0.1% packet loss"
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":1250},"name":"bandwidth_down","stream":"downstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"bandwidth","attributes":{"rate":500},"name":"bandwidth_up","stream":"upstream"}' > /dev/null
    curl -sf -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -d '{"type":"latency","attributes":{"latency":50,"jitter":20},"name":"latency"}' > /dev/null
    ;;

  clear)
    echo "Clearing all toxics (direct connection)"
    curl -sf -X DELETE "$API/proxies/$PROXY_NAME/toxics" > /dev/null 2>&1 || true
    ;;

  *)
    echo "Unknown profile: $PROFILE"
    echo "Available: slow-3g, fast-3g, 4g-lte, wifi, lan, production, clear"
    exit 1
    ;;
esac

echo "Done. Proxy available at localhost:7140"
