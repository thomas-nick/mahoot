# Leaderboards data scrapers

Python pipeline that powers `/leaderboards/*` on the mahoot frontend.

## What runs where

- `update.py` — DGPT Manufacturers Cup + Player Tour Stats. Pulls from StatMando, overlays PDGA event results (so we catch finishes before StatMando weekly refresh).
- `asia.py` — Asia & SE Asia leaderboard. Pulls from PDGA event pages, MPO/FPO only, with country attribution from player profiles.

Both scripts write JSON into two places:

| Path | Purpose |
| --- | --- |
| `scripts/leaderboards/data/` | Canonical source + caches (kept across runs) |
| `frontend/public/data/leaderboards/` | Static JSON the Next.js app imports at build time |

## Run locally

```bash
cd scripts/leaderboards
pip install -r requirements.txt

# Manufacturers Cup + Player Tour
python3 update.py MPO FPO --refresh-events

# Asia leaderboard (event refresh + rating sparklines)
python3 asia.py --refresh-events --rating-history

# Find new Asia events on PDGA (slow — only run occasionally)
python3 asia.py --discover
```

After running, the frontend will pick up changes the next time you `npm run build`
(JSON is bundled as static `import`s, not runtime fetched).

## Automated refresh

`.github/workflows/leaderboards-data.yml` runs the same commands twice a week
(Mon 17:00 UTC, Tue 13:00 UTC) and commits any data deltas back to `main`.
The VPS picks them up on the next git pull + PM2 restart.
