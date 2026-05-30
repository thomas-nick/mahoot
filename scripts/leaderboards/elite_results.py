#!/usr/bin/env python3
"""Discover PDGA Elite/Major finishes and link them to coverage event IDs.

Outputs:
  data/elite_results_cache.json       — raw PDGA event scrape cache
  data/elite_pdga_map.json            — coverage_event_id → pdga_event_id
  ../../frontend/public/data/coverage_results/index.json
  ../../frontend/public/data/coverage_results/{coverage_event_id}.json

Reuse the PDGA scraping patterns from asia.py; event keys from ytapi canonical_event_key.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import threading
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
CACHE_PATH = DATA_DIR / "elite_results_cache.json"
MAP_PATH = DATA_DIR / "elite_pdga_map.json"
ALIASES_PATH = DATA_DIR / "elite_event_aliases.json"
COVERAGE_CATALOG = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_catalog.json"
OUTPUT_DIR = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_results"

YTAPI_ROOT = Path.home() / "ytapi"
if YTAPI_ROOT.exists():
    sys.path.insert(0, str(YTAPI_ROOT))

from extract_jomez_metadata import canonical_event_key, parse_year, tournament_id  # noqa: E402

# Top MPO tour players — used to discover PDGA event IDs via /player/{id}/stats/{year}
SEED_PLAYERS_MPO = (
    268910,  # Gannon Buhr
    45971,   # Calvin Heimburg
    79232,   # Richard Wysocki
    27523,   # Paul McBeth
    91249,   # Niklas Anttila
    116809,  # Anthony Barela
    75412,   # Isaac Robinson
    73958,   # Ezra Robinson
    74186,   # James Proctor
    24213,   # Chris Dickerson
    74586,   # Simon Lizotte
    81363,   # Cole Redalen
)

ELITE_TIERS = frozenset({"M", "NT", "ES", "A"})
DGPT_HINTS = (
    "dgpt",
    "disc golf pro tour",
    "champions cup",
    "world championship",
    "usdgc",
    "european open",
    "european disc golf festival",
    "ledgestone",
    "idlewild",
    "otb open",
    "open at austin",
    "mvp open",
    "preserve",
    "jonesboro",
    "great lakes",
    "green mountain",
    "portland open",
    "dynamic discs open",
    "music city",
    "kansas city",
    "des moines",
    "las vegas challenge",
    "waco",
    "supreme flight",
    "queen city",
    "discmania challenge",
    "beaver state",
    "chess.com invitational",
    "northwest disc golf",
)

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 "
            "(KHTML, like Gecko) Version/17.5 Safari/605.1.15"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
)
PDGA_DELAY = 1.6
RETRY_DELAYS = (8, 25, 90, 240)
_RATE_LOCK = threading.Lock()
_LAST_CALL = [0.0]


def pdga_get(url: str, params: dict | None = None) -> requests.Response:
    last_exc: Exception | None = None
    for wait in (0,) + RETRY_DELAYS:
        if wait:
            time.sleep(wait)
        try:
            with _RATE_LOCK:
                elapsed = time.monotonic() - _LAST_CALL[0]
                if elapsed < PDGA_DELAY:
                    time.sleep(PDGA_DELAY - elapsed)
                _LAST_CALL[0] = time.monotonic()
            r = SESSION.get(url, params=params, timeout=30)
            if r.status_code in (403, 429, 502, 503):
                last_exc = requests.HTTPError(f"{r.status_code} for {r.url}")
                continue
            r.raise_for_status()
            return r
        except requests.RequestException as exc:
            last_exc = exc
            continue
    raise last_exc if last_exc else RuntimeError("pdga_get failed")


def load_json(path: Path, default: dict | list | None = None):
    if not path.exists():
        return default if default is not None else {}
    return json.loads(path.read_text())


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def coverage_event_id(title: str, year: str | None) -> str | None:
    if not title or not year:
        return None
    key = canonical_event_key(title)
    if not key:
        return None
    return tournament_id(title, year)


def normalize_pdga_event_title(title: str) -> str:
    """Strip DGPT/sponsor noise so PDGA titles align with coverage event keys."""
    s = title.strip()
    s = re.sub(r"^20\d{2}\s+", "", s)
    s = re.sub(r"^DGPT\+\s*", "", s, flags=re.I)
    s = re.sub(r"^DGPT\s+(?:Elite\s+|Silver\s+|Playoffs[-\s]*)?", "", s, flags=re.I)
    s = re.sub(r"^DGPT\s*", "", s, flags=re.I)
    s = re.sub(r"^ET#\d+\s*[-–]\s*", "", s, flags=re.I)
    s = re.sub(r"\s+presented by .+$", "", s, flags=re.I)
    s = re.sub(r"\s+powered by .+$", "", s, flags=re.I)
    s = re.sub(r"\s+sponsored by .+$", "", s, flags=re.I)
    s = re.sub(r"\s+Presented By .+$", "", s, flags=re.I)
    s = re.sub(r"\s+by OTB.*$", "", s, flags=re.I)
    s = re.sub(r"^The\s+", "", s, flags=re.I)
    return s.strip()


def pdga_coverage_event_id(title: str, year: str | None) -> str | None:
    cleaned = normalize_pdga_event_title(title)
    if not cleaned or not year:
        return None
    key = canonical_event_key(cleaned)
    if not key:
        return None
    if "world_championship" in key or key.startswith("pdga_professional_disc_golf"):
        key = "pdga_pro_worlds"
    if key.startswith("pdga_champions_cup") or "champions_cup" in key:
        key = "pdga_champions_cup"
    if key.startswith("united_states_disc_golf"):
        key = "usdgc"
    return f"{year}_{key}"


def parse_coverage_event_id(cov_id: str) -> tuple[str, str] | None:
    m = re.match(r"^(20\d{2})_(.+)$", cov_id)
    if not m:
        return None
    return m.group(1), m.group(2)


def is_elite_major_candidate(name: str, tier: str) -> bool:
    low = (name or "").lower()
    if tier in ("M",):
        return True
    if tier in ("NT", "ES", "A") and any(h in low for h in DGPT_HINTS):
        return True
    if "dgpt" in low or "champions cup" in low or "world championship" in low:
        return True
    if "usdgc" in low or "united states disc golf championship" in low:
        return True
    if "european open" in low or "european disc golf festival" in low:
        return True
    return False


def fetch_player_year_events(pdga: int, year: str) -> list[dict]:
    r = pdga_get(f"https://www.pdga.com/player/{pdga}/stats/{year}")
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "Place" not in headers or "Tournament" not in headers:
            continue
        col = {h: i for i, h in enumerate(headers)}
        for tr in table.find_all("tr")[1:]:
            cells = tr.find_all("td")
            if len(cells) < 4:
                continue
            tour_cell = cells[col["Tournament"]]
            link = tour_cell.find("a")
            if not link or not link.get("href"):
                continue
            m = re.search(r"/tour/event/(\d+)", link["href"])
            if not m:
                continue
            tier = cells[col["Tier"]].get_text(strip=True) if "Tier" in col else ""
            name = tour_cell.get_text(" ", strip=True)
            if not is_elite_major_candidate(name, tier):
                continue
            out.append(
                {
                    "pdga_event_id": m.group(1),
                    "name": name,
                    "tier": tier,
                    "year": year,
                }
            )
    return out


def scrape_pdga_event(pdga_event_id: str) -> dict:
    r = pdga_get(f"https://www.pdga.com/tour/event/{pdga_event_id}")
    soup = BeautifulSoup(r.text, "html.parser")

    title_el = soup.find("h1")
    title = title_el.get_text(strip=True) if title_el else f"Event {pdga_event_id}"

    location = ""
    date_text = ""
    sidebar = soup.find("div", class_=re.compile(r"pane-pdga-event-info|event-info|sidebar"))
    body_text = (sidebar or soup).get_text("\n", strip=True)
    loc_match = re.search(r"Location\s*:?\s*\n?\s*([^\n]+)", body_text)
    if loc_match:
        location = loc_match.group(1).strip()
    date_match = re.search(r"(?:Dates?)\s*:?\s*\n?\s*([^\n]+)", body_text)
    if date_match:
        date_text = date_match.group(1).strip()
    year = parse_year(date_text) or parse_year(title) or ""

    tier_letter = ""
    for h in soup.find_all(["h2", "h3", "h4"]):
        txt = h.get_text(strip=True)
        m = re.search(r"([A-Z])-Tier", txt)
        if m:
            tier_letter = m.group(1)
            break

    results = []
    for h3 in soup.find_all("h3"):
        heading = h3.get_text(strip=True)
        div_match = re.match(r"^([A-Z]+\d*) ·", heading)
        if not div_match:
            continue
        division = div_match.group(1)
        if division not in ("MPO", "FPO"):
            continue
        table = h3.find_next("table")
        if not table:
            continue
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        col = {h: i for i, h in enumerate(headers)}
        for tr in table.find_all("tr")[1:]:
            cells = tr.find_all("td")
            if not cells or len(cells) < 5:
                continue

            def cell(name: str) -> str:
                idx = col.get(name)
                if idx is None or idx >= len(cells):
                    return ""
                return cells[idx].get_text(" ", strip=True)

            place_text = cell("Place")
            try:
                place = int(re.sub(r"[^0-9]", "", place_text))
            except (ValueError, TypeError):
                continue
            try:
                pdga_pts = float(cell("Points"))
            except ValueError:
                pdga_pts = 0.0
            name = cell("Name")
            pdga_text = cell("PDGA#")
            try:
                pdga_num = int(re.sub(r"[^0-9]", "", pdga_text))
            except (ValueError, TypeError):
                continue
            rating_text = cell("Rating")
            rating = int(rating_text) if rating_text.isdigit() else None
            prize = cell("Prize (USD)") or cell("Prize")
            score_text = cell("Total") or cell("Score") or cell("Strokes")

            results.append(
                {
                    "pdga": pdga_num,
                    "name": name,
                    "division": division,
                    "place": place,
                    "pdga_points": pdga_pts,
                    "rating": rating,
                    "prize": prize,
                    "score": score_text or None,
                }
            )

    cov_id = pdga_coverage_event_id(title, year) if year else None

    return {
        "pdga_event_id": pdga_event_id,
        "title": title,
        "location": location,
        "dates": date_text,
        "year": year,
        "tier": tier_letter,
        "coverage_event_id": cov_id,
        "results": results,
    }


def discover_pdga_events(years: list[str], log=print) -> dict[str, dict]:
    """Return pdga_event_id → discovery metadata."""
    found: dict[str, dict] = {}
    for year in years:
        log(f"Discovering events for {year}…")
        for pdga in SEED_PLAYERS_MPO:
            try:
                events = fetch_player_year_events(pdga, year)
            except Exception as exc:
                log(f"  ✗ player {pdga} {year}: {exc}")
                continue
            for ev in events:
                eid = ev["pdga_event_id"]
                if eid not in found:
                    found[eid] = ev
            log(f"  · player {pdga}: +{len(events)} candidates ({len(found)} total)")
    return found


def load_target_coverage_events(catalog_path: Path) -> dict[str, dict]:
    catalog = load_json(catalog_path, {})
    targets = {}
    for ev in catalog.get("events", []):
        tag = ev.get("tour_tag")
        if tag not in ("dgpt_elite", "major"):
            continue
        targets[ev["id"]] = {
            "id": ev["id"],
            "title": ev.get("title"),
            "year": ev.get("year"),
            "tour_tag": tag,
        }
    return targets


def build_pdga_to_coverage_map(
    cache: dict,
    aliases: dict,
    targets: dict[str, dict],
) -> dict[str, str]:
    """coverage_event_id → pdga_event_id."""
    manual = aliases.get("coverage_to_pdga", {})
    out: dict[str, str] = {}

    for cov_id, pdga_id in manual.items():
        if cov_id in targets:
            out[cov_id] = str(pdga_id)

    # Match scraped events to coverage targets by normalized id
    by_cov: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    for pdga_id, ev in cache.items():
        if ev.get("error") or not ev.get("results"):
            continue
        cov_id = pdga_coverage_event_id(ev.get("title", ""), ev.get("year", ""))
        if not cov_id:
            continue
        parsed = parse_coverage_event_id(cov_id)
        if not parsed:
            continue
        year, key = parsed
        for target_id, target in targets.items():
            if target_id in out:
                continue
            tp = parse_coverage_event_id(target_id)
            if not tp:
                continue
            ty, tk = tp
            if year == ty and key == tk:
                by_cov[target_id].append((pdga_id, ev))

    for cov_id, matches in by_cov.items():
        if cov_id in out:
            continue
        best = max(
            matches,
            key=lambda m: sum(1 for r in m[1].get("results", []) if r["division"] == "MPO"),
        )
        out[cov_id] = best[0]

    return out


def write_coverage_result(cov_id: str, pdga_id: str, ev: dict, target: dict) -> dict:
    mpo = sorted(
        [r for r in ev.get("results", []) if r["division"] == "MPO"],
        key=lambda r: r["place"],
    )
    fpo = sorted(
        [r for r in ev.get("results", []) if r["division"] == "FPO"],
        key=lambda r: r["place"],
    )
    mpo_ratings = [r["rating"] for r in mpo if r.get("rating")]
    return {
        "coverage_event_id": cov_id,
        "pdga_event_id": pdga_id,
        "title": ev.get("title") or target.get("title"),
        "year": ev.get("year") or target.get("year"),
        "location": ev.get("location"),
        "dates": ev.get("dates"),
        "tier": ev.get("tier"),
        "tour_tag": target.get("tour_tag"),
        "field_size": len(mpo) + len(fpo),
        "mpo_count": len(mpo),
        "fpo_count": len(fpo),
        "avg_mpo_rating": round(sum(mpo_ratings) / len(mpo_ratings), 1) if mpo_ratings else None,
        "winner_mpo": mpo[0] if mpo else None,
        "winner_fpo": fpo[0] if fpo else None,
        "mpo": mpo,
        "fpo": fpo,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Link PDGA finishes to coverage events.")
    parser.add_argument("--years", default="", help="Comma years (default: from catalog)")
    parser.add_argument("--limit", type=int, default=0, help="Max PDGA events to scrape")
    parser.add_argument("--event", default="", help="Single coverage event id")
    parser.add_argument("--discover-only", action="store_true")
    parser.add_argument("--skip-discover", action="store_true", help="Use cache + aliases only")
    args = parser.parse_args()

    targets = load_target_coverage_events(COVERAGE_CATALOG)
    if args.event:
        if args.event not in targets:
            raise SystemExit(f"Unknown or untagged coverage event: {args.event}")
        targets = {args.event: targets[args.event]}

    years = [y.strip() for y in args.years.split(",") if y.strip()]
    if not years:
        years = sorted({t["year"] for t in targets.values() if t.get("year")}, reverse=True)

    cache: dict = load_json(CACHE_PATH, {})
    aliases: dict = load_json(ALIASES_PATH, {"coverage_to_pdga": {}, "pdga_to_coverage": {}})

    if not args.skip_discover:
        discovered = discover_pdga_events(years)
        # Merge manual alias PDGA ids
        for cov_id, pdga_id in aliases.get("coverage_to_pdga", {}).items():
            discovered[str(pdga_id)] = {
                "pdga_event_id": str(pdga_id),
                "name": targets.get(cov_id, {}).get("title", cov_id),
                "year": targets.get(cov_id, {}).get("year", ""),
                "tier": "M",
            }

        scrape_ids = list(discovered.keys())
        if args.limit:
            scrape_ids = scrape_ids[: args.limit]

        print(f"Scraping {len(scrape_ids)} PDGA events…")
        for i, pdga_id in enumerate(scrape_ids, 1):
            if pdga_id in cache and cache[pdga_id].get("results") and not cache[pdga_id].get("error"):
                continue
            try:
                ev = scrape_pdga_event(pdga_id)
                cache[pdga_id] = ev
                cov = ev.get("coverage_event_id") or "?"
                mpo_n = sum(1 for r in ev["results"] if r["division"] == "MPO")
                print(f"  [{i}/{len(scrape_ids)}] {pdga_id} → {cov} ({mpo_n} MPO)")
            except Exception as exc:
                cache[pdga_id] = {"pdga_event_id": pdga_id, "error": str(exc), "results": []}
                print(f"  [{i}/{len(scrape_ids)}] ✗ {pdga_id}: {exc}")
        save_json(CACHE_PATH, cache)

    if args.discover_only:
        return

    cov_map = build_pdga_to_coverage_map(cache, aliases, targets)
    save_json(MAP_PATH, cov_map)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    index: dict[str, dict] = {}
    written = 0

    for cov_id, target in targets.items():
        pdga_id = cov_map.get(cov_id)
        if not pdga_id:
            index[cov_id] = {"matched": False, "title": target.get("title")}
            continue
        ev = cache.get(pdga_id)
        if not ev or ev.get("error") or not ev.get("results"):
            index[cov_id] = {"matched": False, "pdga_event_id": pdga_id, "title": target.get("title")}
            continue
        payload = write_coverage_result(cov_id, pdga_id, ev, target)
        save_json(OUTPUT_DIR / f"{cov_id}.json", payload)
        index[cov_id] = {
            "matched": True,
            "pdga_event_id": pdga_id,
            "title": payload["title"],
            "year": payload["year"],
            "field_size": payload["field_size"],
            "mpo_count": payload["mpo_count"],
            "fpo_count": payload["fpo_count"],
            "winner_mpo": payload["winner_mpo"]["name"] if payload["winner_mpo"] else None,
            "winner_fpo": payload["winner_fpo"]["name"] if payload["winner_fpo"] else None,
        }
        written += 1

    index_meta = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "matched_count": written,
        "target_count": len(targets),
        "events": index,
    }
    save_json(OUTPUT_DIR / "index.json", index_meta)
    print(f"\nWrote {written}/{len(targets)} coverage result files → {OUTPUT_DIR}")

    try:
        import build_coverage_media_stats
        import build_coverage_players

        build_coverage_media_stats.main()
        build_coverage_players.main()
    except Exception as exc:
        print(f"Note: player profile build skipped ({exc})")


if __name__ == "__main__":
    main()
