#!/usr/bin/env python3
"""
Assert that a booted backend container is correctly wired.

Reads the JSON body of GET /api/health from argv[1] and fails loudly if the
PO-token provider, ffmpeg, or the player-client chain are not as expected.
This is the check that proves the Dockerfile and entrypoint.sh actually
produced a working image.
"""
import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else '/tmp/health.json'

try:
    with open(path) as fh:
        d = json.load(fh)
except Exception as exc:  # noqa: BLE001
    print(f'FAIL could not read {path}: {exc}')
    sys.exit(1)

version = str(d.get('ytdlp', {}).get('version') or '')
chain = str(d.get('playerClientChain') or '')

checks = {
    'PO-token provider reachable': d.get('potProvider', {}).get('reachable') is True,
    'ffmpeg present': d.get('ffmpeg') is True,
    'yt-dlp resolved': bool(version) and not version.startswith(('error', 'unavailable')),
    'chain starts with mweb (PO-backed)': chain.startswith('mweb'),
}

failed = 0
for label, ok in checks.items():
    print(f'{"PASS" if ok else "FAIL"} {label}')
    if not ok:
        failed += 1

print(f'\nyt-dlp version : {version or "(missing)"}')
print(f'player chain   : {chain or "(missing)"}')
print(f'pot provider   : {d.get("potProvider")}')

if failed:
    print(f'\n{failed} check(s) failed — the image is not correctly wired.')
    sys.exit(1)

print('\nAll health checks passed.')
