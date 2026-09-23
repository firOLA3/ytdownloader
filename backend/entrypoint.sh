#!/bin/sh
# Starts the bgutil PO-token provider, then the API.
#
# The provider must run for the 'mweb' player client to obtain proof-of-origin
# tokens; without it, YouTube bot-checks this server's datacentre IP and every
# fetch fails with "Sign in to confirm you're not a bot".
set -e

POT_PORT="${POT_PORT:-4416}"

if [ "${ENABLE_POT_PROVIDER:-1}" = "1" ]; then
    echo "[entrypoint] starting bgutil PO-token provider on 127.0.0.1:${POT_PORT}"

    # Loopback only: the provider is unauthenticated, so it must never be
    # reachable from outside the container.
    (
        while true; do
            node /opt/bgutil/server/build/main.js --port "$POT_PORT" --host 127.0.0.1 \
                || echo "[entrypoint] PO provider exited, restarting in 2s"
            sleep 2
        done
    ) &

    # Give the provider a bounded moment to come up. Non-fatal if it is slow:
    # the API degrades to the PO-free player-client chain and still serves.
    i=0
    while [ "$i" -lt 15 ]; do
        if curl -sf "http://127.0.0.1:${POT_PORT}/ping" > /dev/null 2>&1; then
            echo "[entrypoint] PO provider is up"
            break
        fi
        i=$((i + 1))
        sleep 1
    done
    [ "$i" -ge 15 ] && echo "[entrypoint] WARNING: PO provider not reachable after 15s"
else
    echo "[entrypoint] PO provider disabled (ENABLE_POT_PROVIDER=0)"
fi

exec node server.js
