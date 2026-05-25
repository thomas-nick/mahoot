#!/usr/bin/env python3
"""Scrape PDGA Asia Tour + adjacent Asian events for an MPO/FPO leaderboard.

Strategy is events-first to minimize PDGA traffic and avoid 429s:
  1. Hardcoded seed = the 8 official 2026 PDGA Asia Tour event IDs.
  2. Scrape MPO+FPO results for each seed event (one request per event).
  3. For every pro discovered, fetch their /player/{id}/stats/{year} once per
     year. This surfaces *all* their 2025/2026 events with PDGA event IDs.
  4. Inspect each newly-seen event ID once to decide if it was hosted in an
     Asian country (location text match).
  5. Scrape MPO+FPO for each Asian event found in step 4.
  6. For each unique pro, fetch /player/{id} once for country / classification.
  7. Aggregate by player across all 2025+2026 Asian events.

Outputs data/asia_players.json consumed by the /asia dashboard.
"""

from __future__ import annotations

import json
import re
import sys
import time
import threading
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent / "data"
EVENTS_CACHE = DATA_DIR / "asia_events_cache.json"
PROFILES_CACHE = DATA_DIR / "asia_profiles_cache.json"
RESULTS_CACHE = DATA_DIR / "asia_results_cache.json"
RATING_HISTORY_CACHE = DATA_DIR / "asia_rating_history_cache.json"
OUTPUT_FILE = DATA_DIR / "asia_players.json"
EVENT_DETAIL_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "data" / "leaderboards" / "asia_events"

YEARS = ("2025", "2026")

# Official 2026 PDGA Asia Tour event IDs (from https://www.pdga.com/asiatour)
SEED_EVENTS_2026_TOUR = [
    "96943",  # Asia Disc Golf Open (Chinese Taipei)
    "96727",  # Siam Open (Thailand)
    "95859",  # Samui Swine Classic XIII Pros (Thailand)
    "97037",  # Chiang Mai Open IV (Thailand)
    "97272",  # Lipad Pilipinas IV (Philippines)
    "97704",  # 14th Okinawa Open (Japan)
    "97588",  # Asia Tour Championship (China)
]

# Additional 2025 + 2026 Asian PDGA events (discovered via partial cache).
# Keep growing this list as we find more — the scraper auto-skips non-Asian ones.
SEED_EVENTS_EXTRA = [
    # 2025 Japan Open series
    "87628",  # 13th Okinawa Open
    "88891",  # 24th Chubu Open
    "89761",  # 22nd Saga Yoshinogari Open
    "90538",  # 32nd Tokyo Open
    "91149",  # 9th Fukui Open
    "93189",  # 14th Hokkaido Open
    "92377",  # 27th Nippon Open
    "94669",  # 28th Kansai Open
    "94274",  # 37th National Championships (Japan)
    "96591",  # 4th Maiko Classic
    "93358",  # 4th Disc Golf Japan Series
    "96928",  # 39th Kyushu Open
    # 2025 Thailand
    "84698",  # Samui Swine Classic XII
    "95658",  # Coco-breeze 3
    "96436",  # Trat Disc Golf Open 2025
    "96352",  # Hyzerween VII
    # 2026 Thailand
    "95844",  # Samui Swine XIII Ams
    "99712",  # King of Island v.4
    "99672",  # City of Trat
    "99236",  # Yasothon Valentine Classic
    "97979",  # Samui Winter Warm Up
    "99301",  # 11th Hyzenbrownie Open
    "99715",  # Koh Kood Open
    "103055", # Coco Splash
    # 2026 Vietnam / Cambodia / Philippines
    "99899",  # Saigon Open
    "101735", # Freedom Flight Open
    # 2026 Japan
    "102712", # 1st Shibukawa Open
]

ALL_SEED_EVENTS = SEED_EVENTS_2026_TOUR + SEED_EVENTS_EXTRA

ASIA_COUNTRIES = {
    "thailand": ("TH", "🇹🇭", "Thailand"),
    "philippines": ("PH", "🇵🇭", "Philippines"),
    "japan": ("JP", "🇯🇵", "Japan"),
    "south korea": ("KR", "🇰🇷", "South Korea"),
    "singapore": ("SG", "🇸🇬", "Singapore"),
    "malaysia": ("MY", "🇲🇾", "Malaysia"),
    "indonesia": ("ID", "🇮🇩", "Indonesia"),
    "vietnam": ("VN", "🇻🇳", "Vietnam"),
    "chinese taipei": ("TW", "🇹🇼", "Chinese Taipei"),
    "taiwan": ("TW", "🇹🇼", "Chinese Taipei"),
    "china": ("CN", "🇨🇳", "China"),
    "mongolia": ("MN", "🇲🇳", "Mongolia"),
    "russia": ("RU", "🇷🇺", "Russia"),
    "hong kong": ("HK", "🇭🇰", "Hong Kong"),
    "cambodia": ("KH", "🇰🇭", "Cambodia"),
    "india": ("IN", "🇮🇳", "India"),
    "laos": ("LA", "🇱🇦", "Laos"),
    "brunei": ("BN", "🇧🇳", "Brunei"),
    "macau": ("MO", "🇲🇴", "Macau"),
    "myanmar": ("MM", "🇲🇲", "Myanmar"),
    "kazakhstan": ("KZ", "🇰🇿", "Kazakhstan"),
}

# Map PDGA 2-letter country codes (from /players?Country=XX) to tuples.
COUNTRY_BY_CODE = {key: (key, flag, name) for (key, flag, name) in ASIA_COUNTRIES.values()}

COUNTRY_LIST = sorted(
    {v for v in ASIA_COUNTRIES.values()},
    key=lambda x: x[2],
)

# Custom weighted scoring (mirror /players model, adapted for Asian tier mix)
TOUR_LEVELS = ("major", "elite", "asia_tour", "a_tier", "b_tier", "c_tier")
TIER_MULTIPLIERS = {
    "major": 4.0,
    "elite": 2.5,
    "asia_tour": 2.0,
    "a_tier": 1.0,
    "b_tier": 0.5,
    "c_tier": 0.2,
}


def finish_base_points(place: int) -> int:
    if place == 1:
        return 100
    if place == 2:
        return 75
    if place == 3:
        return 55
    if place <= 5:
        return 35
    if place <= 10:
        return 20
    if place <= 25:
        return 8
    return 3


def weighted_finish_points(place: int, level: str) -> float:
    mult = TIER_MULTIPLIERS.get(level, 0.0)
    if mult == 0:
        return 0.0
    return round(finish_base_points(place) * mult, 1)


# Official PDGA Asia Tour scoring per https://www.pdga.com/asiatour
#   1st=100, 2nd=90, 3rd=85, 4th=80, 5th=75, 6th=70, ...19th=5
ASIA_TOUR_POINTS = {
    1: 100, 2: 90, 3: 85, 4: 80, 5: 75, 6: 70, 7: 65, 8: 60, 9: 55, 10: 50,
    11: 45, 12: 40, 13: 35, 14: 30, 15: 25, 16: 20, 17: 15, 18: 10, 19: 5,
}
ASIA_TOUR_MIN_EVENTS = 2  # must play this many to qualify
ASIA_TOUR_COUNT_BEST = 4  # only best N events count toward final total


# ---------- HTTP plumbing ----------

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


def load_cache(path: Path) -> dict:
    return json.loads(path.read_text()) if path.exists() else {}


def save_cache(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2))


# ---------- event scraping ----------

DATE_TAIL = re.compile(r"(\d{4})\s*$")


def parse_event_year(date_text: str) -> str:
    m = DATE_TAIL.search(date_text)
    return m.group(1) if m else ""


def parse_event_country(location: str) -> tuple[str, str, str] | None:
    if not location:
        return None
    tail = location.split(",")[-1].strip().lower()
    if tail in ASIA_COUNTRIES:
        return ASIA_COUNTRIES[tail]
    for key in ASIA_COUNTRIES:
        if key in location.lower():
            return ASIA_COUNTRIES[key]
    return None


def classify_event_tier(tier: str, name: str, is_asia_tour: bool) -> str:
    lower = (name or "").lower()
    if tier == "M" or "world championship" in lower or "champions cup" in lower:
        return "major"
    if tier == "NT" or "dgpt" in lower:
        return "elite"
    if is_asia_tour or "pdga asia tour" in lower:
        return "asia_tour"
    if tier == "A":
        return "a_tier"
    if tier == "B":
        return "b_tier"
    return "c_tier"


def scrape_event(event_id: str) -> dict:
    """Scrape an event page; return meta + MPO+FPO results."""
    r = pdga_get(f"https://www.pdga.com/tour/event/{event_id}")
    soup = BeautifulSoup(r.text, "html.parser")

    title_el = soup.find("h1")
    title = title_el.get_text(strip=True) if title_el else f"Event {event_id}"

    # event info
    info_table = soup.find("table")
    status = ""
    total_players = 0
    if info_table:
        info_headers = [th.get_text(strip=True) for th in info_table.find_all("th")]
        info_cells = info_table.find_all("td")
        info_map = {h: c.get_text(" ", strip=True) for h, c in zip(info_headers, info_cells)}
        status = info_map.get("Status", "")
        try:
            total_players = int(re.sub(r"[^0-9]", "", info_map.get("Total Players", "0")) or "0")
        except ValueError:
            total_players = 0

    # location + dates — the labels and values are in separate nodes, so
    # walk the rendered text of the sidebar pane instead.
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
    year = parse_event_year(date_text)

    # tier from sidebar (e.g. "Pro/Am B-Tier")
    tier_letter = ""
    for h in soup.find_all(["h2", "h3", "h4"]):
        txt = h.get_text(strip=True)
        m = re.search(r"([A-Z])-Tier", txt)
        if m:
            tier_letter = m.group(1)
            break

    is_asia_tour = bool(re.search(r"pdga\s+asia\s+tour", title.lower()))
    level = classify_event_tier(tier_letter, title, is_asia_tour)

    # results — only MPO and FPO
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
            try:
                rating = int(rating_text) if rating_text.isdigit() else None
            except ValueError:
                rating = None
            prize_text = cell("Prize (USD)") or cell("Prize")

            results.append(
                {
                    "pdga": pdga_num,
                    "name": name,
                    "division": division,
                    "place": place,
                    "pdga_points": pdga_pts,
                    "rating": rating,
                    "prize": prize_text,
                    "weighted_points": weighted_finish_points(place, level),
                }
            )

    return {
        "event_id": event_id,
        "title": title,
        "location": location,
        "dates": date_text,
        "year": year,
        "tier": tier_letter,
        "level": level,
        "is_asia_tour": is_asia_tour,
        "status": status,
        "total_players": total_players,
        "results": results,
    }


# ---------- player profile scraping ----------


def fetch_player_profile(pdga: int) -> dict:
    """Hit /player/{id} once to get country / classification / rating.

    Strategy:
      1. Find the location <a href="/players?...Country=XX"> link — most reliable.
      2. Fall back to the player-info pane text "Location: <country>".
    """
    r = pdga_get(f"https://www.pdga.com/player/{pdga}")
    soup = BeautifulSoup(r.text, "html.parser")

    name_el = soup.find("h1")
    name = name_el.get_text(strip=True) if name_el else f"PDGA {pdga}"

    pane = soup.find("div", class_=re.compile(r"pane-pdga-player-info|player-info"))
    pane_text = (pane or soup).get_text("\n", strip=True)

    def field(label: str) -> str:
        m = re.search(rf"{re.escape(label)}\s*:?\s*\n?\s*([^\n]+)", pane_text)
        return m.group(1).strip() if m else ""

    location_text = field("Location")
    nationality = field("Nationality")
    classification = field("Classification")
    membership = field("Membership Status")
    rating_text = field("Current Rating")

    # find the country=XX link inside the pane
    country_code = ""
    if pane:
        for a in pane.find_all("a", href=re.compile(r"Country=([A-Z]{2})")):
            m = re.search(r"Country=([A-Z]{2})", a["href"])
            if m:
                country_code = m.group(1)
                break
    if not country_code:
        for a in soup.find_all("a", href=re.compile(r"\?City.*?Country=([A-Z]{2})")):
            m = re.search(r"Country=([A-Z]{2})", a["href"])
            if m:
                country_code = m.group(1)
                break

    flag_info = COUNTRY_BY_CODE.get(country_code)
    if flag_info:
        ckey, flag, cname = flag_info
    else:
        # location text fallback (last comma-separated segment)
        tail = location_text.split(",")[-1].strip().lower() if location_text else ""
        flag_info = ASIA_COUNTRIES.get(tail) or ASIA_COUNTRIES.get(nationality.lower())
        if flag_info:
            ckey, flag, cname = flag_info
        else:
            ckey, flag = "", "🌐"
            cname = location_text.split(",")[-1].strip() if location_text else nationality or "—"

    rating: int | None
    rating_match = re.match(r"(\d{3,4})", rating_text)
    rating = int(rating_match.group(1)) if rating_match else None

    return {
        "pdga": pdga,
        "name": name,
        "country": cname,
        "country_key": ckey,
        "country_code_raw": country_code,
        "flag": flag,
        "nationality": nationality,
        "classification": classification,
        "membership": membership,
        "city": location_text.split(",")[0].strip() if location_text else "",
        "location_raw": location_text,
        "rating": rating,
    }


def fetch_rating_history(pdga: int) -> list[dict]:
    """Return [{date: 'YYYY-MM-DD', rating: int, rounds: int}, ...] sorted oldest→newest."""
    r = pdga_get(f"https://www.pdga.com/player/{pdga}/history")
    soup = BeautifulSoup(r.text, "html.parser")
    out: list[dict] = []
    months = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
        "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
    }
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "Effective Date" not in headers or "Rating" not in headers:
            continue
        col = {h: i for i, h in enumerate(headers)}
        for tr in table.find_all("tr")[1:]:
            cells = tr.find_all("td")
            if len(cells) < 2:
                continue
            date_txt = cells[col["Effective Date"]].get_text(strip=True)
            m = re.match(r"(\d{1,2})-([A-Za-z]+)-(\d{4})", date_txt)
            if not m:
                continue
            day, mon, year = m.groups()
            iso = f"{year}-{months.get(mon[:3], '00')}-{int(day):02d}"
            rating_txt = cells[col["Rating"]].get_text(strip=True)
            rounds_txt = cells[col["Rounds Used"]].get_text(strip=True) if "Rounds Used" in col else "0"
            try:
                rating = int(rating_txt)
            except ValueError:
                continue
            try:
                rounds = int(rounds_txt)
            except ValueError:
                rounds = 0
            out.append({"date": iso, "rating": rating, "rounds": rounds})
        break
    out.sort(key=lambda x: x["date"])
    # Trim to last ~24 months for sparkline relevance
    return out[-24:] if len(out) > 24 else out


def fetch_player_year_events(pdga: int, year: str) -> list[dict]:
    """Get all event IDs a player participated in for a given year."""
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
            out.append(
                {
                    "event_id": m.group(1),
                    "name": tour_cell.get_text(" ", strip=True),
                    "tier": cells[col["Tier"]].get_text(strip=True) if "Tier" in col else "",
                    "dates": cells[col["Dates"]].get_text(" ", strip=True) if "Dates" in col else "",
                    "year": year,
                }
            )
    return out


# ---------- orchestration ----------


def scrape_seed_events(
    seed_event_ids: list[str],
    events_cache: dict,
    log=print,
) -> dict:
    """Scrape every seed event ID, skipping ones not held in Asia or outside 2025-2026."""
    log(f"\nScraping {len(seed_event_ids)} seed events")
    for eid in seed_event_ids:
        if eid in events_cache and not events_cache[eid].get("error"):
            log(f"  · {eid} cached: {events_cache[eid].get('title','')[:60]}")
            continue
        try:
            ev = scrape_event(eid)
        except Exception as exc:
            log(f"  ✗ {eid}: {exc}")
            events_cache[eid] = {"event_id": eid, "error": str(exc), "results": []}
            continue
        country = parse_event_country(ev.get("location", ""))
        if country is None and not ev.get("is_asia_tour"):
            events_cache[eid] = {**ev, "skipped": True}
            log(f"  − {eid} skipped (non-Asia: {ev.get('location','')})")
            continue
        if ev.get("year") not in YEARS:
            events_cache[eid] = {**ev, "skipped": True}
            log(f"  − {eid} skipped (year {ev.get('year','?')})")
            continue
        events_cache[eid] = ev
        log(
            f"  ✓ {eid} [{ev['tier'] or '?'}] {ev['title'][:55]}"
            f"{' [Asia Tour]' if ev['is_asia_tour'] else ''} — {len(ev['results'])} MPO+FPO"
        )
    save_cache(EVENTS_CACHE, events_cache)
    return events_cache


def enrich_rating_history(
    aggregated_pdga_ids: list[int],
    history_cache: dict,
    log=print,
) -> dict:
    """Fetch rating history per pro (one PDGA request each)."""
    targets = [p for p in aggregated_pdga_ids if str(p) not in history_cache]
    log(f"\nFetching rating history for {len(targets)} players (cached: {len(history_cache)})")
    for i, pdga in enumerate(targets, 1):
        try:
            history_cache[str(pdga)] = fetch_rating_history(pdga)
        except Exception as exc:
            log(f"  ✗ history {pdga}: {exc}")
            history_cache[str(pdga)] = []
        if i % 25 == 0:
            log(f"  · {i}/{len(targets)} histories — checkpoint")
            save_cache(RATING_HISTORY_CACHE, history_cache)
    save_cache(RATING_HISTORY_CACHE, history_cache)
    return history_cache


def enrich_player_profiles(
    events_cache: dict,
    profiles_cache: dict,
    log=print,
) -> dict:
    """Fetch /player/{id} once per discovered pro to learn country + rating."""
    pros: set[int] = set()
    for ev in events_cache.values():
        if ev.get("skipped"):
            continue
        for row in ev.get("results", []):
            pros.add(row["pdga"])
    needs = [p for p in pros if str(p) not in profiles_cache]
    log(f"\nEnriching {len(needs)} profiles (cached: {len(profiles_cache)})")
    for i, pdga in enumerate(needs, 1):
        try:
            profiles_cache[str(pdga)] = fetch_player_profile(pdga)
        except Exception as exc:
            log(f"  ✗ profile {pdga}: {exc}")
            profiles_cache[str(pdga)] = {"pdga": pdga, "country": "", "country_key": "", "flag": "🌐"}
        if i % 25 == 0:
            log(f"  · {i}/{len(needs)} profiles — checkpoint")
            save_cache(PROFILES_CACHE, profiles_cache)
    save_cache(PROFILES_CACHE, profiles_cache)
    return profiles_cache


def infer_country_from_events(pdga: int, events_cache: dict) -> tuple[str, str, str] | None:
    """Best-effort: pick the country where the player played the most events."""
    from collections import Counter
    counts: Counter = Counter()
    for ev in events_cache.values():
        if ev.get("skipped") or not ev.get("results"):
            continue
        for row in ev["results"]:
            if row["pdga"] == pdga:
                country = parse_event_country(ev.get("location", ""))
                if country:
                    counts[country] += 1
    if not counts:
        return None
    return counts.most_common(1)[0][0]


def discover_new_events(
    events_cache: dict,
    profiles_cache: dict,
    log=print,
    only_asian_residents: bool = True,
) -> dict:
    """Walk cached player profiles to find new Asian event IDs the seed list missed.

    Fetches /player/{id}/stats/{year} for top players and adds any new event IDs
    that look Asian. Use after --enrich has populated profiles_cache.
    """
    candidates = []
    for pid_str, profile in profiles_cache.items():
        if only_asian_residents and not profile.get("country_key"):
            continue
        candidates.append(int(pid_str))
    log(f"\nDiscovering events from {len(candidates)} cached profiles")

    seen_ids: set[str] = set(events_cache.keys())
    discovered: set[str] = set()
    for i, pdga in enumerate(candidates, 1):
        for year in YEARS:
            try:
                ev_list = fetch_player_year_events(pdga, year)
            except Exception as exc:
                log(f"  ✗ {pdga}/{year}: {exc}")
                continue
            for ye in ev_list:
                if ye["event_id"] not in seen_ids:
                    discovered.add(ye["event_id"])
        if i % 25 == 0:
            log(f"  · {i}/{len(candidates)} profiles walked — {len(discovered)} new ids")

    log(f"  → {len(discovered)} candidate new event IDs")
    for eid in sorted(discovered):
        try:
            ev = scrape_event(eid)
        except Exception as exc:
            events_cache[eid] = {"event_id": eid, "error": str(exc), "results": []}
            continue
        country = parse_event_country(ev.get("location", ""))
        if country is None and not ev.get("is_asia_tour"):
            events_cache[eid] = {**ev, "skipped": True}
            continue
        if ev.get("year") not in YEARS:
            events_cache[eid] = {**ev, "skipped": True}
            continue
        events_cache[eid] = ev
        log(f"  + {eid} [{ev['tier'] or '?'}] {ev['title'][:55]} ({country[2] if country else '?'})")
    save_cache(EVENTS_CACHE, events_cache)
    return events_cache


# ---------- aggregation ----------


@dataclass
class AsiaPlayer:
    pdga: int
    name: str
    country: str
    country_key: str
    flag: str
    rating: int | None
    classification: str
    city: str
    nationality: str
    pdga_points: float = 0.0
    tour_weighted_points: float = 0.0
    events_played: int = 0
    wins: int = 0
    podiums: int = 0
    top10: int = 0
    asia_tour_events: int = 0
    asia_tour_points: float = 0.0
    division: str = ""
    last_active: str = ""
    by_level: dict = field(default_factory=dict)
    results: list[dict] = field(default_factory=list)
    rating_history: list[dict] = field(default_factory=list)
    streak: dict = field(default_factory=dict)


def aggregate(events_cache: dict, profiles_cache: dict) -> list[dict]:
    players: dict[int, AsiaPlayer] = {}

    for ev in events_cache.values():
        if ev.get("skipped") or not ev.get("results"):
            continue
        if ev.get("year") not in YEARS:
            continue
        ev_meta = {
            "event_id": ev["event_id"],
            "title": ev["title"],
            "dates": ev["dates"],
            "year": ev["year"],
            "tier": ev["tier"],
            "level": ev["level"],
            "is_asia_tour": ev["is_asia_tour"],
            "location": ev["location"],
        }
        for row in ev["results"]:
            pdga = row["pdga"]
            profile = profiles_cache.get(str(pdga))
            if pdga not in players:
                country_name = ""
                country_key = ""
                flag = ""
                if profile:
                    country_name = profile.get("country") or ""
                    country_key = profile.get("country_key") or ""
                    flag = profile.get("flag") or ""
                profile_blank = (
                    not country_key
                    and not (profile or {}).get("location_raw")
                )
                if not country_key and (not profile or profile_blank):
                    inferred = infer_country_from_events(pdga, events_cache)
                    if inferred:
                        country_key, flag, country_name = inferred
                if not country_name:
                    country_name = "—"
                if not flag:
                    flag = "🌐"
                profile = profile or {}
                players[pdga] = AsiaPlayer(
                    pdga=pdga,
                    name=profile.get("name") or row["name"],
                    country=country_name or "—",
                    country_key=country_key,
                    flag=flag,
                    rating=profile.get("rating") or row.get("rating"),
                    classification=profile.get("classification", "Pro"),
                    city=profile.get("city", ""),
                    nationality=profile.get("nationality", ""),
                    division=row["division"],
                    by_level={lvl: {"events": 0, "points": 0.0, "weighted": 0.0, "wins": 0} for lvl in TOUR_LEVELS},
                )
            p = players[pdga]
            p.pdga_points = round(p.pdga_points + row["pdga_points"], 2)
            p.tour_weighted_points = round(p.tour_weighted_points + row["weighted_points"], 1)
            p.events_played += 1
            if row["place"] == 1:
                p.wins += 1
            if row["place"] <= 3:
                p.podiums += 1
            if row["place"] <= 10:
                p.top10 += 1
            if ev["is_asia_tour"]:
                p.asia_tour_events += 1
                p.asia_tour_points = round(p.asia_tour_points + row["pdga_points"], 2)
            level = ev["level"]
            stats = p.by_level.setdefault(
                level, {"events": 0, "points": 0.0, "weighted": 0.0, "wins": 0}
            )
            stats["events"] += 1
            stats["points"] = round(stats["points"] + row["pdga_points"], 2)
            stats["weighted"] = round(stats["weighted"] + row["weighted_points"], 1)
            if row["place"] == 1:
                stats["wins"] += 1
            if not p.last_active or ev["dates"][-4:] > p.last_active[-4:]:
                p.last_active = ev["dates"]
            p.results.append({**ev_meta, "place": row["place"], "pdga_points": row["pdga_points"]})

    aggregated = [asdict(p) for p in players.values()]
    aggregated.sort(key=lambda p: p["pdga_points"], reverse=True)
    for r, row in enumerate(aggregated, 1):
        row["pdga_rank"] = r
        full_results = sorted(row["results"], key=lambda x: x["dates"][-4:] + x["dates"][:6], reverse=True)
        row["streak"] = compute_streak(full_results)
        row["results"] = full_results[:8]
    by_weighted = sorted(aggregated, key=lambda p: p["tour_weighted_points"], reverse=True)
    for r, row in enumerate(by_weighted, 1):
        row["weighted_rank"] = r
    return aggregated


def compute_streak(results_sorted_desc: list[dict]) -> dict:
    """Compare avg PDGA pts in last 3 finishes vs the player's season avg."""
    if len(results_sorted_desc) < 4:
        return {"direction": "flat", "recent_avg": 0.0, "season_avg": 0.0, "delta_pct": 0.0}
    recent = results_sorted_desc[:3]
    earlier = results_sorted_desc[3:]
    recent_avg = sum(r["pdga_points"] for r in recent) / max(len(recent), 1)
    earlier_avg = sum(r["pdga_points"] for r in earlier) / max(len(earlier), 1)
    if earlier_avg <= 0:
        return {"direction": "flat", "recent_avg": recent_avg, "season_avg": earlier_avg, "delta_pct": 0.0}
    delta_pct = (recent_avg - earlier_avg) / earlier_avg * 100
    direction = "up" if delta_pct >= 15 else "down" if delta_pct <= -15 else "flat"
    return {
        "direction": direction,
        "recent_avg": round(recent_avg, 1),
        "season_avg": round(earlier_avg, 1),
        "delta_pct": round(delta_pct, 1),
    }


def attach_rating_history(aggregated: list[dict], history_cache: dict) -> None:
    """Inline each pro's recent rating history into the aggregated payload."""
    for row in aggregated:
        history = history_cache.get(str(row["pdga"])) or []
        # Keep last 18 months for sparkline (~12 rating updates)
        row["rating_history"] = history[-15:]


def write_event_details(events_cache: dict, players_by_pdga: dict, log=print) -> int:
    """Emit per-event JSON files for the /asia/event/[id] detail pages."""
    EVENT_DETAIL_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for ev in events_cache.values():
        if ev.get("skipped") or not ev.get("results") or ev.get("year") not in YEARS:
            continue
        rows = []
        for r in ev["results"]:
            player = players_by_pdga.get(r["pdga"], {})
            rows.append(
                {
                    "pdga": r["pdga"],
                    "name": r["name"],
                    "division": r["division"],
                    "place": r["place"],
                    "pdga_points": r["pdga_points"],
                    "rating": r.get("rating"),
                    "prize": r.get("prize"),
                    "flag": player.get("flag", "🌐"),
                    "country": player.get("country", "—"),
                    "country_key": player.get("country_key", ""),
                }
            )
        # split by division and sort by place
        mpo = sorted([r for r in rows if r["division"] == "MPO"], key=lambda r: r["place"])
        fpo = sorted([r for r in rows if r["division"] == "FPO"], key=lambda r: r["place"])
        # compute MPO field strength
        mpo_ratings = [r["rating"] for r in mpo if r.get("rating")]
        avg_rating = round(sum(mpo_ratings) / len(mpo_ratings), 1) if mpo_ratings else None
        # country breakdown
        from collections import Counter
        cc = Counter((r["flag"], r["country"]) for r in rows if r["country_key"])
        breakdown = [{"flag": f, "country": c, "count": n} for (f, c), n in cc.most_common()]
        payload = {
            "event_id": ev["event_id"],
            "title": ev["title"],
            "location": ev["location"],
            "dates": ev["dates"],
            "year": ev["year"],
            "tier": ev["tier"],
            "level": ev["level"],
            "is_asia_tour": ev["is_asia_tour"],
            "status": ev.get("status", ""),
            "field_size": len(rows),
            "avg_mpo_rating": avg_rating,
            "country_breakdown": breakdown,
            "mpo": mpo,
            "fpo": fpo,
        }
        (EVENT_DETAIL_DIR / f"{ev['event_id']}.json").write_text(json.dumps(payload, indent=2))
        written += 1
    log(f"Wrote {written} per-event detail JSON files to {EVENT_DETAIL_DIR}")
    return written


def compute_asia_tour_standings(events_cache: dict, players_by_pdga: dict) -> list[dict]:
    """Official PDGA Asia Tour standings: best 4 finishes count, min 2 events."""
    from collections import defaultdict

    per_player: dict[int, list[dict]] = defaultdict(list)
    tour_event_ids: list[str] = []
    for ev in events_cache.values():
        if not ev.get("is_asia_tour") or ev.get("skipped"):
            continue
        if not ev.get("results"):
            continue
        tour_event_ids.append(ev["event_id"])
        for row in ev["results"]:
            per_player[row["pdga"]].append(
                {
                    "event_id": ev["event_id"],
                    "event": ev["title"][:55],
                    "tour_event": _asia_tour_number(ev["title"]),
                    "division": row["division"],
                    "place": row["place"],
                    "points": ASIA_TOUR_POINTS.get(row["place"], 0),
                    "dates": ev["dates"],
                }
            )

    standings = []
    for pdga, results in per_player.items():
        if len(results) < ASIA_TOUR_MIN_EVENTS:
            continue
        top = sorted(results, key=lambda r: r["points"], reverse=True)[:ASIA_TOUR_COUNT_BEST]
        total = sum(r["points"] for r in top)
        player_meta = players_by_pdga.get(pdga, {})
        standings.append(
            {
                "pdga": pdga,
                "name": player_meta.get("name") or (results[0].get("name", f"PDGA {pdga}")),
                "flag": player_meta.get("flag", "🌐"),
                "country": player_meta.get("country", "—"),
                "country_key": player_meta.get("country_key", ""),
                "division": results[0]["division"],
                "rating": player_meta.get("rating"),
                "events_played": len(results),
                "counting": top,
                "all_results": sorted(results, key=lambda r: r["dates"][-4:] + r["dates"][:6]),
                "total_points": total,
            }
        )
    standings.sort(key=lambda s: s["total_points"], reverse=True)
    for r, s in enumerate(standings, 1):
        s["rank"] = r
    return standings


def _asia_tour_number(title: str) -> str:
    m = re.search(r"Asia Tour\s*(?:Event\s*)?#?(\d+|Championship)", title, re.IGNORECASE)
    if not m:
        return ""
    return m.group(1)


def build_country_champions(aggregated: list[dict], min_events: int = 2) -> list[dict]:
    """Pick the leading player per country (by PDGA points) with at least N events."""
    by_country: dict[str, list[dict]] = {}
    for p in aggregated:
        if not p["country_key"]:
            continue
        if p["events_played"] < min_events:
            continue
        by_country.setdefault(p["country_key"], []).append(p)
    champions = []
    for key, players in by_country.items():
        players.sort(key=lambda p: p["pdga_points"], reverse=True)
        leader = players[0]
        champions.append(
            {
                "country_key": key,
                "country": leader["country"],
                "flag": leader["flag"],
                "player_count": len(players),
                "leader_pdga": leader["pdga"],
                "leader_name": leader["name"],
                "leader_division": leader["division"],
                "leader_rating": leader["rating"],
                "leader_points": leader["pdga_points"],
                "leader_events": leader["events_played"],
                "leader_wins": leader["wins"],
            }
        )
    champions.sort(key=lambda c: c["leader_points"], reverse=True)
    return champions


def build_highlights(events_cache: dict, aggregated: list[dict]) -> dict:
    """Fun stats: biggest fields, most internationally diverse events, etc."""
    asia_events = [
        e for e in events_cache.values()
        if not e.get("skipped") and e.get("results") and e.get("year") in YEARS
    ]
    if not asia_events or not aggregated:
        return {}

    biggest = max(asia_events, key=lambda e: len(e["results"]))
    avg_rating_per_event = []
    for ev in asia_events:
        ratings = [r["rating"] for r in ev["results"] if r["division"] == "MPO" and r.get("rating")]
        if len(ratings) >= 3:
            avg_rating_per_event.append((sum(ratings) / len(ratings), ev))
    strongest = max(avg_rating_per_event, key=lambda x: x[0]) if avg_rating_per_event else None

    most_active = max(aggregated, key=lambda p: p["events_played"])
    most_wins = max(aggregated, key=lambda p: p["wins"])
    podium_machine = max(aggregated, key=lambda p: p["podiums"])

    # most international: distinct profile countries by event field
    diversity = []
    countries_by_pdga = {p["pdga"]: p["country_key"] for p in aggregated if p["country_key"]}
    for ev in asia_events:
        cs = {countries_by_pdga.get(r["pdga"]) for r in ev["results"] if countries_by_pdga.get(r["pdga"])}
        cs.discard(None)
        diversity.append((len(cs), ev))
    most_diverse = max(diversity, key=lambda x: x[0]) if diversity else None

    return {
        "biggest_field": {
            "event_id": biggest["event_id"],
            "title": biggest["title"],
            "field_size": len(biggest["results"]),
            "dates": biggest["dates"],
        },
        "strongest_mpo_field": {
            "event_id": strongest[1]["event_id"],
            "title": strongest[1]["title"],
            "avg_rating": round(strongest[0], 1),
            "dates": strongest[1]["dates"],
        } if strongest else None,
        "most_diverse_event": {
            "event_id": most_diverse[1]["event_id"],
            "title": most_diverse[1]["title"],
            "country_count": most_diverse[0],
            "dates": most_diverse[1]["dates"],
        } if most_diverse else None,
        "most_active_player": {
            "pdga": most_active["pdga"],
            "name": most_active["name"],
            "flag": most_active["flag"],
            "events": most_active["events_played"],
        },
        "most_wins_player": {
            "pdga": most_wins["pdga"],
            "name": most_wins["name"],
            "flag": most_wins["flag"],
            "wins": most_wins["wins"],
        },
        "podium_machine": {
            "pdga": podium_machine["pdga"],
            "name": podium_machine["name"],
            "flag": podium_machine["flag"],
            "podiums": podium_machine["podiums"],
        },
    }


# ---------- main ----------


def main() -> None:
    args = sys.argv[1:]
    refresh_events = "--refresh-events" in args
    refresh_profiles = "--refresh-profiles" in args
    refresh_history = "--refresh-history" in args
    enrich = "--enrich" in args
    discover = "--discover" in args
    rating_history = "--rating-history" in args or "--enrich" in args

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    events_cache = {} if refresh_events else load_cache(EVENTS_CACHE)
    profiles_cache = {} if refresh_profiles else load_cache(PROFILES_CACHE)
    history_cache = {} if refresh_history else load_cache(RATING_HISTORY_CACHE)

    print(
        f"Starting with {len(events_cache)} cached events / "
        f"{len(profiles_cache)} profiles / {len(history_cache)} rating histories"
    )
    print(f"Seeded with {len(SEED_EVENTS_2026_TOUR)} Asia Tour 2026 + {len(SEED_EVENTS_EXTRA)} extra Asian events")

    events_cache = scrape_seed_events(ALL_SEED_EVENTS, events_cache, log=print)

    if enrich:
        profiles_cache = enrich_player_profiles(events_cache, profiles_cache, log=print)

    if discover:
        events_cache = discover_new_events(events_cache, profiles_cache, log=print)

    if rating_history:
        pros_in_data = sorted({r["pdga"] for ev in events_cache.values() if not ev.get("skipped") for r in ev.get("results", [])})
        history_cache = enrich_rating_history(pros_in_data, history_cache, log=print)

    print("\nAggregating...")
    aggregated = aggregate(events_cache, profiles_cache)
    attach_rating_history(aggregated, history_cache)

    # per-country stats
    by_country: dict = {}
    for (key, flag, name) in COUNTRY_LIST:
        players_for = [p for p in aggregated if p["country_key"] == key]
        players_for.sort(key=lambda p: p["pdga_points"], reverse=True)
        for r, row in enumerate(players_for, 1):
            row["country_rank"] = r
        by_country[key] = {
            "key": key,
            "name": name,
            "flag": flag,
            "player_count": len(players_for),
            "leader": players_for[0] if players_for else None,
        }
    # international bucket for players without an Asian home country
    intl = [p for p in aggregated if not p["country_key"]]
    by_country["INTL"] = {
        "key": "INTL",
        "name": "International",
        "flag": "🌐",
        "player_count": len(intl),
        "leader": intl[0] if intl else None,
    }

    asia_events = [
        e
        for e in events_cache.values()
        if not e.get("skipped") and e.get("results") and e.get("year") in YEARS
    ]
    asia_events.sort(key=lambda e: (e["year"], e["dates"]), reverse=True)

    players_by_pdga = {p["pdga"]: p for p in aggregated}
    tour_standings = compute_asia_tour_standings(events_cache, players_by_pdga)
    country_champions = build_country_champions(aggregated)
    highlights = build_highlights(events_cache, aggregated)

    payload = {
        "title": "PDGA Asia Tour & Regional Leaderboard",
        "description": "MPO + FPO results across 2025-2026 Asian PDGA events",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "years": list(YEARS),
        "scoring": {
            "levels": list(TOUR_LEVELS),
            "tier_multipliers": TIER_MULTIPLIERS,
            "primary": "pdga_points",
            "notes": (
                "Primary metric is PDGA's official Points sum (already weighted by "
                "tier + field strength). Tour weighted is our custom finish model — "
                "PDGA Asia Tour events get a 2.0x multiplier, A/B/C tier follow the "
                "global player tour weighting."
            ),
            "asia_tour_official": {
                "rule": "Top 4 finishes count, min 2 events to qualify",
                "points": ASIA_TOUR_POINTS,
            },
        },
        "countries": [{"key": k, "name": n, "flag": f} for (k, f, n) in COUNTRY_LIST],
        "country_stats": by_country,
        "country_champions": country_champions,
        "tour_standings": tour_standings,
        "highlights": highlights,
        "events": [
            {
                "event_id": e["event_id"],
                "title": e["title"],
                "location": e["location"],
                "dates": e["dates"],
                "year": e["year"],
                "tier": e["tier"],
                "level": e["level"],
                "is_asia_tour": e["is_asia_tour"],
                "field_size": len(e["results"]),
            }
            for e in asia_events
        ],
        "asia_tour_events": [
            e
            for e in [
                {
                    "event_id": ev["event_id"],
                    "title": ev["title"],
                    "location": ev["location"],
                    "dates": ev["dates"],
                    "field_size": len(ev["results"]),
                }
                for ev in events_cache.values()
                if ev.get("is_asia_tour") and not ev.get("skipped")
            ]
        ],
        "total_events": len(asia_events),
        "total_players": len(aggregated),
        "players": aggregated,
    }

    OUTPUT_FILE.write_text(json.dumps(payload, indent=2))
    print(f"\nSaved {OUTPUT_FILE} — {len(aggregated)} pros across {len(asia_events)} Asian events")

    dashboard_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "data" / "leaderboards" / "asia_players.json"
    if dashboard_path.parent.exists():
        dashboard_path.write_text(OUTPUT_FILE.read_text())
        print(f"Synced {dashboard_path}")

    write_event_details(events_cache, players_by_pdga, log=print)

    print("\nTop 15 (by PDGA points):")
    for row in aggregated[:15]:
        print(
            f"  {row['pdga_rank']:>3}. {row['flag']} {row['name']:<26} "
            f"{row['pdga_points']:>7.1f} pts · {row['events_played']:>2} ev "
            f"({row['wins']}W/{row['podiums']}P) {row['division']}"
        )


if __name__ == "__main__":
    main()
