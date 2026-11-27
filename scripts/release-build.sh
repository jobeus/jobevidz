#!/usr/bin/env bash
# Installs exact dependencies and builds the server and client for production. deployd runs
# this in each new release folder on grizzly (a failure leaves the live release alone, and
# Apache keeps serving the old client/dist until the switch); also the build to run by hand.
# --include=dev: the build tools are dev dependencies, skipped where NODE_ENV=production.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."

echo "release-build: server"
(cd server && npm ci --include=dev --no-audit --no-fund && npm run build)

echo "release-build: client"
(cd client && npm ci --include=dev --no-audit --no-fund && npx tsc -b && npx vite build)

test -f server/dist/index.js && test -f client/dist/index.html
echo "release-build: done"
