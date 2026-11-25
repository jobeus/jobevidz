#!/usr/bin/env bash
# Runs the jobevidz API, relaunching it whenever it exits with code 42. The deploy webhook
# exits that way after it has `git pull`ed and run scripts/release-build.sh, so the new
# build is already in place. Builds first only if there is no server build at all.
# Any other exit code ends the loop (systemd's Restart=always covers crashes).
cd "$(dirname "$0")" || exit 1

while true; do
    if [ ! -f server/dist/index.js ]; then
        ./scripts/release-build.sh || exit 1
    fi

    node server/dist/index.js
    code=$?
    echo "start.sh: jobevidz exited with code $code"

    if [ "$code" -ne 42 ]; then
        exit "$code"
    fi
    echo "start.sh: restarting onto the new build"
    sleep 1
done
