#!/bin/sh
# The music bed. "Beauty Flow" by Kevin MacLeod (incompetech.com), licensed
# CC BY 4.0 — the credit card in compositions/close.html is the licence
# condition. Fetched, not committed: 17 MB of someone else's media.
set -e
cd "$(dirname "$0")/.."
mkdir -p assets/music
curl -sL -A "Mozilla/5.0" -o assets/music/beauty-flow.mp3 "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Beauty%20Flow.mp3"
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 assets/music/beauty-flow.mp3
