#!/usr/bin/env bash
# Installs exact dependencies and builds the server and client for production.
# The deploy webhook runs this after `git pull`; it is also the manual build.
# The client is built into client/dist-next and swapped in at the end, so Apache never
# serves a half-written client/dist.
# --include=dev: the service runs with NODE_ENV=production, which would skip the build tools.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."

# start.sh runs this before every launch: skip the (minutes-long) build when this commit is
# already built.
head=$(git rev-parse HEAD)
if [ "$(cat .release-built 2>/dev/null)" = "$head" ] && [ -f server/dist/index.js ] && [ -d client/dist ]; then
    echo "release-build: $(git rev-parse --short HEAD) already built"
    exit 0
fi

echo "release-build: server"
(cd server && npm ci --include=dev --no-audit --no-fund && npm run build)

echo "release-build: client"
(cd client && npm ci --include=dev --no-audit --no-fund \
  && npx tsc -b && npx vite build --outDir dist-next --emptyOutDir)

rm -rf client/dist-prev
if [ -d client/dist ]; then mv client/dist client/dist-prev; fi
mv client/dist-next client/dist
rm -rf client/dist-prev
printf '%s\n' "$head" >| .release-built
echo "release-build: done ($(git rev-parse --short HEAD))"
