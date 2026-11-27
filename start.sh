#!/usr/bin/env bash
# Runs jobevidz. On grizzly this is what app@jobevidz.service starts, from the live release in
# /srv/apps/jobevidz; deployd builds each release (scripts/release-build.sh) before it gets
# here. Locally: scripts/release-build.sh, then ./start.sh.
cd "$(dirname "$(readlink -f "$0")")" || exit 1

if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

exec /usr/bin/node server/dist/index.js
