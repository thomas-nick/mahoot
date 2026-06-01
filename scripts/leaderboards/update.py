#!/usr/bin/env python3
"""Fetch DGPT standings from StatMando and aggregate by disc manufacturer."""

from __future__ import annotations

import json
import re
import sys
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent / "data"
CACHE_FILE = DATA_DIR / "manufacturer_cache.json"
EVENTS_CACHE_FILE = DATA_DIR / "events_cache.json"
OUTPUT_FILE = DATA_DIR / "manufacturers_cup.json"
PLAYER_TOUR_OUTPUT = DATA_DIR / "player_tour_stats.json"
EVENTS_YEAR = "2026"
MONTH_ORDER = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
# Tour levels that count toward weighted player tour points (B/C/leagues excluded)
TOUR_LEVELS = ("major", "elite", "a_tier")
# A-tier kept well below Elite: strong early-season A events fade mid/summer (overseas
# tour, split fields). Design rule: Elite T10 (20×2.5=50) > A-tier win (100×0.35=35).
TIER_MULTIPLIERS = {
    "major": 4.0,
    "elite": 2.5,
    "a_tier": 0.35,
    "b_tier": 0.0,
    "other": 0.0,
}

STANDINGS_URLS = {
    "MPO": "https://statmando.com/rankings/dgpt/mpo",
    "FPO": "https://statmando.com/rankings/dgpt/fpo",
}

# Recent DGPT events to merge from PDGA when StatMando player profiles lag.
# Each entry: event_id, display name override (optional), tier, tour, month.
SEED_PDGA_EVENTS = [
    {
        "event_id": "96409",
        "event": "DGPT+ OTB Open by MVP Disc Sports",
        "tier": "NT",
        "tour": "DGPT",
        "month": "May",
    },
    {
        "event_id": "98193",
        "event": "DGPT JomezPro - Discraft Cascade Challenge",
        "tier": "A",
        "tour": "DGPT",
        "month": "May",
    },
]

MANUFACTURER_NAMES = {
    "Discmania": {"color": "#f59e0b", "short": "DMN"},
    "Discraft": {"color": "#2563eb", "short": "DSC"},
    "Innova": {"color": "#dc2626", "short": "INV"},
    "Latitude64": {"color": "#0891b2", "short": "L64"},
    "Latitude 64": {"color": "#0891b2", "short": "L64"},
    "MVP": {"color": "#7c3aed", "short": "MVP"},
    "Axiom": {"color": "#a855f7", "short": "AXI"},
    "Prodigy": {"color": "#059669", "short": "PRD"},
    "Dynamic Discs": {"color": "#ca8a04", "short": "DD"},
    "Westside": {"color": "#64748b", "short": "WS"},
    "Streamline": {"color": "#6366f1", "short": "STL"},
    "Gateway": {"color": "#16a34a", "short": "GTW"},
    "DGA": {"color": "#0d9488", "short": "DGA"},
    "Kastaplast": {"color": "#475569", "short": "KPL"},
    "Climo Disc Golf": {"color": "#78716c", "short": "CDG"},
    "DD": {"color": "#ca8a04", "short": "DD"},
    "Infinite": {"color": "#0284c7", "short": "INF"},
    "Kastaplast": {"color": "#475569", "short": "KPL"},
    "Westside": {"color": "#64748b", "short": "WS"},
    "Mint": {"color": "#10b981", "short": "MNT"},
    "Clash": {"color": "#f97316", "short": "CLH"},
    "ThoughtSpace": {"color": "#8b5cf6", "short": "TSA"},
    "OTB": {"color": "#334155", "short": "OTB"},
    "Unknown": {"color": "#6b7280", "short": "???"},
}

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": "ManuCup/1.0 (disc golf manufacturers cup; github.com/manucup)",
        "Accept": "text/html",
    }
)


@dataclass
class PlayerStanding:
    rank: int
    rank_gain: int
    slug: str
    name: str
    points: float
    points_gain: float
    starts: int
    wins: int
    top10s: int
    cashed: int
    manufacturer: str | None = None


def normalize_manufacturer(raw: str | None) -> str:
    if not raw:
        return "Unknown"
    name = raw.replace(".png", "").replace(".jpg", "")
    aliases = {
        "Latitude64": "Latitude 64",
        "DynamicDiscs": "Dynamic Discs",
        "ClimoDiscGolf": "Climo Disc Golf",
    }
    return aliases.get(name, name)


def load_cache() -> dict[str, str]:
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text())
    return {}


def save_cache(cache: dict[str, str]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, indent=2, sort_keys=True))


def load_events_cache() -> dict[str, list[dict]]:
    if EVENTS_CACHE_FILE.exists():
        return json.loads(EVENTS_CACHE_FILE.read_text())
    return {}


def save_events_cache(cache: dict[str, list[dict]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    EVENTS_CACHE_FILE.write_text(json.dumps(cache, indent=2, sort_keys=True))


def normalize_event_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name).strip()
    for prefix in ("DGPT+ ", "DGPT - ", "DGPT "):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :]
    return cleaned[:60]


def event_slug(name: str) -> str:
    slug = normalize_event_name(name).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug[:48] or "event"


def parse_profile_events(html: str, year: str = EVENTS_YEAR) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    events: list[dict] = []
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if headers[:3] != ["Event Name", "Month", "Year"]:
            continue
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) < 7 or cells[2].get_text(strip=True) != year:
                continue
            place_raw = cells[4].get_text(strip=True)
            if not place_raw.isdigit():
                continue
            name = cells[0].get_text(strip=True)
            events.append(
                {
                    "event": name,
                    "event_key": event_slug(name),
                    "month": cells[1].get_text(strip=True),
                    "place": int(place_raw),
                    "tier": cells[10].get_text(strip=True) if len(cells) > 10 else "",
                    "tour": cells[11].get_text(strip=True) if len(cells) > 11 else "",
                }
            )
    return events


def fetch_player_events(slug: str) -> list[dict]:
    url = f"https://statmando.com/player/{slug}/profile"
    response = SESSION.get(url, timeout=30)
    response.raise_for_status()
    return parse_profile_events(response.text)


def player_name_key(name: str) -> str:
    cleaned = re.sub(r"\s#\d+$", "", name).strip().lower()
    return re.sub(r"[^a-z]", "", cleaned)


def scrape_pdga_event_division(event_id: str, division: str) -> list[dict]:
    """Return [{name, place, pdga}, ...] for one division from a PDGA event page."""
    response = SESSION.get(f"https://www.pdga.com/tour/event/{event_id}", timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    for h3 in soup.find_all("h3"):
        heading = h3.get_text(strip=True)
        if not heading.startswith(f"{division} ·"):
            continue
        table = h3.find_next("table")
        if not table:
            return []
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        col = {h: i for i, h in enumerate(headers)}
        rows: list[dict] = []
        for tr in table.find_all("tr")[1:]:
            cells = tr.find_all("td")
            if len(cells) < 4:
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
            name = cell("Name")
            pdga_text = cell("PDGA#")
            try:
                pdga_num = int(re.sub(r"[^0-9]", "", pdga_text))
            except (ValueError, TypeError):
                pdga_num = 0
            rows.append({"name": name, "place": place, "pdga": pdga_num})
        return rows
    return []


def merge_seed_pdga_events(
    players: list[PlayerStanding],
    cache: dict[str, list[dict]],
    division: str,
    log=print,
) -> int:
    """Overlay PDGA event finishes onto StatMando event cache when profiles are stale."""
    slug_by_name = {player_name_key(p.name): p.slug for p in players}
    added = 0

    for seed in SEED_PDGA_EVENTS:
        event_id = seed["event_id"]
        event_name = seed["event"]
        event_key = event_slug(event_name)
        tier = seed.get("tier", "NT")
        tour = seed.get("tour", "DGPT")
        month = seed.get("month", "")

        results = scrape_pdga_event_division(event_id, division)
        if not results:
            continue
        log(f"  PDGA overlay: {event_name[:50]} ({division}) — {len(results)} finishes")
        time.sleep(0.5)
        for row in results:
            slug = slug_by_name.get(player_name_key(row["name"]))
            if not slug:
                continue
            existing = cache.setdefault(slug, [])
            if any(ev.get("event_key") == event_key for ev in existing):
                continue
            existing.append(
                {
                    "event": event_name,
                    "event_key": event_key,
                    "month": month,
                    "place": row["place"],
                    "tier": tier,
                    "tour": tour,
                    "source": f"pdga:{event_id}",
                }
            )
            added += 1
    if added:
        save_events_cache(cache)
        log(f"  Added {added} PDGA event finishes to cache")
    return added


def enrich_player_events(
    players: list[PlayerStanding],
    cache: dict[str, list[dict]],
    skip: bool = False,
    refresh: bool = False,
) -> dict[str, list[dict]]:
    if skip:
        return {p.slug: cache.get(p.slug, []) for p in players}

    targets = list(players) if refresh else [p for p in players if p.slug not in cache]
    if targets:
        label = "Refreshing" if refresh else "Fetching"
        print(f"  {label} 2026 events for {len(targets)} players...")
        with ThreadPoolExecutor(max_workers=6) as pool:
            futures = {pool.submit(fetch_player_events, p.slug): p.slug for p in targets}
            for index, future in enumerate(as_completed(futures), 1):
                slug = futures[future]
                try:
                    cache[slug] = future.result()
                except Exception as exc:
                    print(f"    Warning: events failed for {slug}: {exc}", file=sys.stderr)
                    cache[slug] = []
                if index % 20 == 0:
                    time.sleep(0.4)
                    save_events_cache(cache)
        save_events_cache(cache)

    return {p.slug: cache.get(p.slug, []) for p in players}


def scoring_config() -> dict:
    return {
        "levels": list(TOUR_LEVELS),
        "tier_multipliers": TIER_MULTIPLIERS,
        "finish_base": {
            "1": 100,
            "2": 75,
            "3": 55,
            "4-5": 35,
            "6-10": 20,
            "11-25": 8,
            "26+": 3,
        },
        "formula": "weighted_points = finish_base(place) × tier_multiplier(level)",
        "notes": (
            "Major = PDGA Majors & Champions Cup · Elite = DGPT NT/ES · "
            "A-tier = A-tiers, Jomez, Q-Series (weighted low — fields soften mid-season). "
            "Elite top-10 scores above an A-tier win."
        ),
        "benchmarks": {
            "elite_win": weighted_finish_points(1, "elite"),
            "elite_t10": weighted_finish_points(10, "elite"),
            "a_tier_win": weighted_finish_points(1, "a_tier"),
            "major_win": weighted_finish_points(1, "major"),
        },
    }


def classify_event_level(tier: str, tour: str, name: str) -> str:
    lower = name.lower()
    if "masters disc golf" in lower and "world" not in lower:
        return "other"
    if tier == "M" or "champions cup" in lower or "world championship" in lower:
        return "major"
    if tour == "Major":
        return "major"
    if tier == "NT" or tour == "DGPT":
        return "elite"
    if "dgpt" in lower and tier in ("", "A", "NT", "ES"):
        if "q-series" in lower or tier == "A":
            return "a_tier"
        return "elite"
    if tier == "A" or "q-series" in lower or "jomez" in lower:
        return "a_tier"
    if tier == "B":
        return "b_tier"
    return "other"


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


def build_player_tour_report(
    division: str,
    players: list[PlayerStanding],
    events_by_slug: dict[str, list[dict]],
    week: str | None,
) -> dict:
    player_lookup = {p.slug: p for p in players}
    player_stats: dict[str, dict] = {}
    event_buckets: dict[str, dict] = {}

    empty_level = lambda: {"starts": 0, "wins": 0, "podiums": 0, "top10": 0, "points": 0.0}

    for slug, events in events_by_slug.items():
        player = player_lookup.get(slug)
        if not player:
            continue
        stats = player_stats.setdefault(
            slug,
            {
                "slug": slug,
                "name": player.name,
                "dgpt_rank": player.rank,
                "manufacturer": player.manufacturer or "Unknown",
                "dgpt_points": player.points,
                "dgpt_points_gain": player.points_gain,
                "tour_weighted_points": 0.0,
                "wins": 0,
                "podiums": 0,
                "top10": 0,
                "tour_starts": 0,
                "by_level": {level: empty_level() for level in TOUR_LEVELS},
                "results": [],
            },
        )

        for ev in events:
            level = classify_event_level(ev.get("tier") or "", ev.get("tour") or "", ev["event"])
            if level not in TOUR_LEVELS:
                continue

            place = ev["place"]
            pts = weighted_finish_points(place, level)
            key = ev["event_key"]
            bucket = event_buckets.setdefault(
                key,
                {
                    "id": key,
                    "name": normalize_event_name(ev["event"]),
                    "tier": ev.get("tier") or "",
                    "tour": ev.get("tour") or "",
                    "month": ev.get("month") or "",
                    "level": level,
                    "multiplier": TIER_MULTIPLIERS[level],
                    "entries": 0,
                    "results": [],
                },
            )
            bucket["entries"] += 1
            bucket["results"].append(
                {
                    "slug": slug,
                    "name": player.name,
                    "manufacturer": player.manufacturer or "Unknown",
                    "place": place,
                    "weighted_points": pts,
                }
            )

            lvl = stats["by_level"][level]
            lvl["starts"] += 1
            lvl["points"] = round(lvl["points"] + pts, 1)
            stats["tour_weighted_points"] = round(stats["tour_weighted_points"] + pts, 1)
            stats["tour_starts"] += 1
            if place == 1:
                stats["wins"] += 1
                lvl["wins"] += 1
            if place <= 3:
                stats["podiums"] += 1
                lvl["podiums"] += 1
            if place <= 10:
                stats["top10"] += 1
                lvl["top10"] += 1

            stats["results"].append(
                {
                    "event_key": key,
                    "event": normalize_event_name(ev["event"]),
                    "month": ev.get("month") or "",
                    "place": place,
                    "level": level,
                    "weighted_points": pts,
                }
            )

    tour_players: list[dict] = []
    for slug, stats in player_stats.items():
        if stats["tour_starts"] == 0:
            continue
        stats["results"].sort(
            key=lambda r: (
                MONTH_ORDER.get(r["month"], 0),
                {"major": 0, "elite": 1, "a_tier": 2}.get(r["level"], 9),
            ),
            reverse=True,
        )
        stats["recent_results"] = stats["results"][:5]
        del stats["results"]
        tour_players.append(stats)

    tour_players.sort(
        key=lambda p: (p["tour_weighted_points"], p["wins"], p["podiums"]),
        reverse=True,
    )
    for rank, row in enumerate(tour_players, 1):
        row["tour_rank"] = rank

    events_out: list[dict] = []
    for key, bucket in event_buckets.items():
        results = sorted(bucket["results"], key=lambda r: r["place"])
        winner = results[0] if results else None
        events_out.append(
            {
                "id": key,
                "name": bucket["name"],
                "tier": bucket["tier"],
                "tour": bucket["tour"],
                "month": bucket["month"],
                "level": bucket["level"],
                "multiplier": bucket["multiplier"],
                "entries": bucket["entries"],
                "winner": winner,
                "top_finishes": results[:5],
            }
        )

    level_order = {"major": 0, "elite": 1, "a_tier": 2}
    events_out.sort(
        key=lambda e: (
            MONTH_ORDER.get(e["month"], 0),
            level_order.get(e["level"], 9),
        ),
        reverse=True,
    )

    leader = tour_players[0] if tour_players else None
    by_level = {level: 0 for level in TOUR_LEVELS}
    for e in events_out:
        by_level[e["level"]] = by_level.get(e["level"], 0) + 1

    return {
        "division": division,
        "week": week,
        "year": EVENTS_YEAR,
        "player_count": len(players),
        "tour_player_count": len(tour_players),
        "event_count": len(events_out),
        "events_by_level": by_level,
        "players": tour_players,
        "events": events_out,
        "insights": {
            "leader": leader,
            "most_wins": max(tour_players, key=lambda p: p["wins"]) if tour_players else None,
            "recent_events": events_out[:4],
        },
    }


def compute_roster_meta(players: list[dict], pool_points: float) -> dict:
    if not players:
        return {
            "top4_share": 0.0,
            "star_gap": 0.0,
            "best_mover": None,
            "market_share": 0.0,
            "power_index": 0,
        }

    sorted_players = sorted(players, key=lambda p: p["points"], reverse=True)
    total_points = sum(p["points"] for p in players)
    top4_points = sum(p["points"] for p in sorted_players[:4])
    fourth = sorted_players[3]["points"] if len(sorted_players) >= 4 else sorted_players[-1]["points"]
    best_mover = max(players, key=lambda p: p.get("rank_gain", 0))
    elite = sum(1 for p in players if p["rank"] <= 20)
    top50 = sum(1 for p in players if p["rank"] <= 50)
    momentum = sum(p["points_gain"] for p in players)
    power_index = round(elite * 100 + top50 * 10 + momentum / 50)

    mover = None
    if best_mover.get("rank_gain", 0) != 0:
        mover = {
            "name": best_mover["name"],
            "slug": best_mover["slug"],
            "rank_gain": best_mover["rank_gain"],
        }

    return {
        "top4_share": round(top4_points / total_points, 3) if total_points else 0.0,
        "star_gap": round(sorted_players[0]["points"] - fourth, 1),
        "best_mover": mover,
        "market_share": round(total_points / pool_points, 3) if pool_points else 0.0,
        "power_index": power_index,
    }


def build_division_meta(players: list[PlayerStanding], manufacturers: list[dict]) -> dict:
    affiliated = [p for p in players if p.manufacturer != "Unknown"]
    unknown = [p for p in players if p.manufacturer == "Unknown"]
    affiliated_points = sum(p.points for p in affiliated)
    unknown_points = sum(p.points for p in unknown)
    brands = [m for m in manufacturers if m["manufacturer"] != "Unknown"]

    return {
        "affiliated_points_pool": round(affiliated_points, 1),
        "unmapped_points": round(unknown_points, 1),
        "coverage_pct": round(len(affiliated) / len(players), 3) if players else 0.0,
        "brand_count": len(brands),
        "avg_roster_size": round(len(affiliated) / len(brands), 1) if brands else 0.0,
        "total_wins": sum(p.wins for p in affiliated),
        "total_starts": sum(p.starts for p in affiliated),
    }


def fetch_standings(division: str) -> tuple[list[PlayerStanding], str | None]:
    url = STANDINGS_URLS[division]
    response = SESSION.get(url, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    week_tag = soup.find("b", string="Week:")
    week = week_tag.next_sibling.strip() if week_tag and week_tag.next_sibling else None
    if not week:
        week_el = soup.find(string=re.compile(r"2026-\d+"))
        week = week_el.strip() if week_el else None

    table = soup.find("div", id="rankings-table")
    if not table:
        raise RuntimeError(f"Could not find standings table for {division}")

    players: list[PlayerStanding] = []
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 8:
            continue

        link = cells[2].find("a", href=re.compile(r"/player/"))
        if not link:
            continue

        slug_match = re.search(r"/player/([^/]+)/profile", link["href"])
        if not slug_match:
            continue

        name = link.get_text(strip=True).rstrip("*")
        try:
            rank_gain_raw = cells[1].get_text(strip=True)
            rank_gain = int(rank_gain_raw) if rank_gain_raw.lstrip("+-").isdigit() else 0
            players.append(
                PlayerStanding(
                    rank=int(cells[0].get_text(strip=True)),
                    rank_gain=rank_gain,
                    slug=slug_match.group(1),
                    name=name,
                    points=float(cells[3].get_text(strip=True)),
                    points_gain=float(cells[4].get_text(strip=True)),
                    starts=int(cells[5].get_text(strip=True)),
                    wins=int(cells[6].get_text(strip=True)),
                    top10s=int(cells[7].get_text(strip=True)),
                    cashed=int(cells[8].get_text(strip=True)) if len(cells) > 8 else 0,
                )
            )
        except ValueError:
            continue

    return players, week


def fetch_manufacturer(slug: str) -> str:
    url = f"https://statmando.com/player/{slug}/profile"
    response = SESSION.get(url, timeout=30)
    response.raise_for_status()
    match = re.search(r'/images/team/([^"]+\.(?:png|jpg|svg))', response.text)
    if not match:
        return "Unknown"
    return normalize_manufacturer(match.group(1))


def enrich_manufacturers(players: list[PlayerStanding], cache: dict[str, str]) -> None:
    missing = [p for p in players if p.slug not in cache]
    if not missing:
        for player in players:
            player.manufacturer = cache.get(player.slug, "Unknown")
        return

    print(f"  Fetching manufacturers for {len(missing)} new players...")
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_manufacturer, p.slug): p.slug for p in missing}
        for index, future in enumerate(as_completed(futures), 1):
            slug = futures[future]
            try:
                cache[slug] = future.result()
            except Exception as exc:
                print(f"    Warning: failed for {slug}: {exc}", file=sys.stderr)
                cache[slug] = "Unknown"
            if index % 25 == 0:
                time.sleep(0.5)

    for player in players:
        player.manufacturer = cache.get(player.slug, "Unknown")


def compute_team_stats(players: list[dict]) -> dict:
    if not players:
        return {
            "elite_count": 0,
            "top50_count": 0,
            "top100_count": 0,
            "avg_points": 0.0,
            "avg_points_gain": 0.0,
            "avg_starts": 0.0,
            "total_cashed": 0,
            "cash_rate": 0.0,
            "win_rate": 0.0,
            "top10_rate": 0.0,
            "momentum": 0.0,
        }

    n = len(players)
    starts = sum(p["starts"] for p in players)
    cashed = sum(p["cashed"] for p in players)
    wins = sum(p["wins"] for p in players)
    top10s = sum(p["top10s"] for p in players)
    momentum = sum(p["points_gain"] for p in players)

    return {
        "elite_count": sum(1 for p in players if p["rank"] <= 20),
        "top50_count": sum(1 for p in players if p["rank"] <= 50),
        "top100_count": sum(1 for p in players if p["rank"] <= 100),
        "avg_points": round(sum(p["points"] for p in players) / n, 1),
        "avg_points_gain": round(momentum / n, 1),
        "avg_starts": round(starts / n, 1),
        "total_cashed": cashed,
        "cash_rate": round(cashed / starts, 3) if starts else 0.0,
        "win_rate": round(wins / starts, 3) if starts else 0.0,
        "top10_rate": round(top10s / starts, 3) if starts else 0.0,
        "momentum": round(momentum, 1),
    }


def score_top4(manufacturers: list[dict]) -> list[dict]:
    """Top-4 cap standings for history / insights (excludes Unknown)."""
    rows = []
    for team in manufacturers:
        if team["manufacturer"] == "Unknown":
            continue
        sorted_players = sorted(team["players"], key=lambda p: p["points"], reverse=True)
        scoring = sorted_players[:4]
        points = sum(p["points"] for p in scoring)
        rows.append(
            {
                "manufacturer": team["manufacturer"],
                "points": round(points, 2),
                "points_gain": round(sum(p["points_gain"] for p in scoring), 2),
            }
        )
    rows.sort(key=lambda r: r["points"], reverse=True)
    for i, row in enumerate(rows, 1):
        row["rank"] = i
    return rows


def build_insights(manufacturers: list[dict], previous: dict | None) -> dict:
    affiliated = [m for m in manufacturers if m["manufacturer"] != "Unknown"]
    top4 = score_top4(manufacturers)

    def leader_stat(key: str, reverse: bool = True):
        if not affiliated:
            return None
        row = sorted(affiliated, key=lambda m: m["stats"][key], reverse=reverse)[0]
        return {"manufacturer": row["manufacturer"], "value": row["stats"][key]}

    def leader_field(key: str, reverse: bool = True):
        if not affiliated:
            return None
        row = sorted(affiliated, key=lambda m: m[key], reverse=reverse)[0]
        return {"manufacturer": row["manufacturer"], "value": row[key]}

    insights: dict = {
        "top4_leader": top4[0] if top4 else None,
        "top4_gap": round(top4[0]["points"] - top4[1]["points"], 1) if len(top4) >= 2 else 0,
        "deepest_roster": leader_field("player_count"),
        "most_elite": leader_stat("elite_count"),
        "hottest_momentum": leader_stat("momentum"),
        "best_efficiency": leader_stat("win_rate"),
        "most_top50": leader_stat("top50_count"),
    }

    if previous and previous.get("top4"):
        prev_ranks = {r["manufacturer"]: r["rank"] for r in previous["top4"]}
        movers = []
        for row in top4:
            prev = prev_ranks.get(row["manufacturer"])
            if prev is not None and prev != row["rank"]:
                movers.append(
                    {
                        "manufacturer": row["manufacturer"],
                        "from": prev,
                        "to": row["rank"],
                        "delta": prev - row["rank"],
                    }
                )
        movers.sort(key=lambda m: abs(m["delta"]), reverse=True)
        insights["biggest_movers"] = movers[:5]

        prev_pts = {r["manufacturer"]: r["points"] for r in previous["top4"]}
        pt_gains = []
        for row in top4:
            if row["manufacturer"] in prev_pts:
                pt_gains.append(
                    {
                        "manufacturer": row["manufacturer"],
                        "points_delta": round(row["points"] - prev_pts[row["manufacturer"]], 1),
                    }
                )
        pt_gains.sort(key=lambda m: m["points_delta"], reverse=True)
        insights["points_movers"] = pt_gains[:5]

    return insights


def load_previous_snapshot(division: str, week: str) -> dict | None:
    history_dir = DATA_DIR / "history"
    if not history_dir.exists():
        return None
    candidates = sorted(history_dir.glob(f"*_{division.lower()}.json"), reverse=True)
    for path in candidates:
        if week in path.name:
            continue
        try:
            data = json.loads(path.read_text())
            if data.get("division") == division:
                return data
        except json.JSONDecodeError:
            continue
    return None


def score_full(manufacturers: list[dict]) -> list[dict]:
    rows = []
    for team in manufacturers:
        if team["manufacturer"] == "Unknown":
            continue
        rows.append(
            {
                "manufacturer": team["manufacturer"],
                "points": team["points"],
                "points_gain": team["points_gain"],
            }
        )
    rows.sort(key=lambda r: r["points"], reverse=True)
    for i, row in enumerate(rows, 1):
        row["rank"] = i
    return rows


def save_snapshot(division: str, week: str, top4: list[dict], full: list[dict]) -> None:
    history_dir = DATA_DIR / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    path = history_dir / f"{week}_{division.lower()}.json"
    path.write_text(
        json.dumps(
            {
                "division": division,
                "week": week,
                "saved_at": datetime.now(timezone.utc).isoformat(),
                "top4": top4,
                "full": full,
            },
            indent=2,
        )
    )


def save_player_tour_snapshot(division: str, week: str, tour_report: dict) -> None:
    history_dir = DATA_DIR / "history"
    history_dir.mkdir(parents=True, exist_ok=True)
    path = history_dir / f"{week}_{division.lower()}_player_tour.json"
    players = [
        {
            "slug": p["slug"],
            "name": p["name"],
            "tour_rank": p["tour_rank"],
            "tour_weighted_points": p["tour_weighted_points"],
            "dgpt_rank": p["dgpt_rank"],
            "wins": p["wins"],
        }
        for p in tour_report.get("players", [])[:12]
    ]
    path.write_text(
        json.dumps(
            {
                "division": division,
                "week": week,
                "saved_at": datetime.now(timezone.utc).isoformat(),
                "players": players,
            },
            indent=2,
        )
    )


TIMELINE_OUTPUT = DATA_DIR / "timeline.json"
PLAYER_TOUR_CHART_COLORS = ["#2563eb", "#dc2626", "#059669", "#7c3aed", "#d97706"]


def build_timeline() -> dict:
    history_dir = DATA_DIR / "history"
    if not history_dir.exists():
        return {"updated_at": datetime.now(timezone.utc).isoformat(), "divisions": {}}

    divisions: dict[str, dict] = {}
    for div in ("MPO", "FPO"):
        cup_by_week: dict[str, list[dict]] = {}
        tour_by_week: dict[str, list[dict]] = {}

        for path in history_dir.glob(f"*_{div.lower()}.json"):
            if path.name.endswith("_player_tour.json"):
                continue
            try:
                data = json.loads(path.read_text())
            except json.JSONDecodeError:
                continue
            week = data.get("week")
            if not week:
                continue
            cup_by_week[week] = [
                {
                    "id": row["manufacturer"],
                    "label": row["manufacturer"],
                    "points": row["points"],
                    "rank": row["rank"],
                    "color": MANUFACTURER_NAMES.get(row["manufacturer"], MANUFACTURER_NAMES["Unknown"])["color"],
                }
                for row in data.get("top4", [])[:6]
            ]

        for path in history_dir.glob(f"*_{div.lower()}_player_tour.json"):
            try:
                data = json.loads(path.read_text())
            except json.JSONDecodeError:
                continue
            week = data.get("week")
            if not week:
                continue
            tour_by_week[week] = [
                {
                    "id": row["slug"],
                    "label": row["name"],
                    "points": row["tour_weighted_points"],
                    "rank": row["tour_rank"],
                }
                for row in data.get("players", [])[:8]
            ]

        weeks = sorted(set(cup_by_week) | set(tour_by_week))
        if not weeks:
            continue

        def series_over_weeks(by_week: dict[str, list[dict]], top_n: int = 5) -> list[dict]:
            if not by_week:
                return []
            latest_week = max(by_week)
            leaders = sorted(by_week[latest_week], key=lambda r: r["rank"])[:top_n]
            series_out = []
            for index, leader in enumerate(leaders):
                points = []
                for week in weeks:
                    row = next((r for r in by_week.get(week, []) if r["id"] == leader["id"]), None)
                    points.append(
                        {
                            "week": week,
                            "value": row["points"] if row else None,
                            "rank": row["rank"] if row else None,
                        }
                    )
                series_out.append(
                    {
                        "id": leader["id"],
                        "label": leader["label"],
                        "color": leader.get("color")
                        or PLAYER_TOUR_CHART_COLORS[index % len(PLAYER_TOUR_CHART_COLORS)],
                        "points": points,
                    }
                )
            return series_out

        divisions[div] = {
            "weeks": weeks,
            "manufacturers_cup": {
                "snapshots": [{"week": w, "standings": cup_by_week[w]} for w in weeks if w in cup_by_week],
                "series": series_over_weeks(cup_by_week),
            },
            "player_tour": {
                "snapshots": [{"week": w, "standings": tour_by_week[w]} for w in weeks if w in tour_by_week],
                "series": series_over_weeks(tour_by_week),
            },
        }

    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "divisions": divisions,
    }


def aggregate_by_manufacturer(players: list[PlayerStanding]) -> list[dict]:
    buckets: dict[str, dict] = defaultdict(
        lambda: {
            "points": 0.0,
            "points_gain": 0.0,
            "players": [],
            "wins": 0,
            "top10s": 0,
            "starts": 0,
        }
    )

    for player in players:
        manufacturer = player.manufacturer or "Unknown"
        bucket = buckets[manufacturer]
        bucket["points"] += player.points
        bucket["points_gain"] += player.points_gain
        bucket["wins"] += player.wins
        bucket["top10s"] += player.top10s
        bucket["starts"] += player.starts
        bucket["players"].append(asdict(player))

    standings = []
    for manufacturer, stats in buckets.items():
        stats["players"].sort(key=lambda p: p["points"], reverse=True)
        meta = MANUFACTURER_NAMES.get(manufacturer, MANUFACTURER_NAMES["Unknown"])
        player_dicts = stats["players"]
        standings.append(
            {
                "manufacturer": manufacturer,
                "short": meta["short"],
                "color": meta["color"],
                "points": round(stats["points"], 2),
                "points_gain": round(stats["points_gain"], 2),
                "player_count": len(player_dicts),
                "wins": stats["wins"],
                "top10s": stats["top10s"],
                "starts": stats["starts"],
                "best_player": player_dicts[0]["name"] if player_dicts else None,
                "best_player_points": player_dicts[0]["points"] if player_dicts else 0,
                "players": player_dicts,
                "stats": compute_team_stats(player_dicts),
            }
        )

    standings.sort(key=lambda row: row["points"], reverse=True)
    for rank, row in enumerate(standings, 1):
        row["rank"] = rank
    return standings


def build_report(division: str, skip_events: bool = False, refresh_events: bool = False) -> tuple[dict, dict]:
    print(f"Fetching {division} standings...")
    players, week = fetch_standings(division)
    print(f"  Found {len(players)} players ({week or 'unknown week'})")

    cache = load_cache()
    enrich_manufacturers(players, cache)
    save_cache(cache)

    events_cache = load_events_cache()
    events_by_slug = enrich_player_events(
        players, events_cache, skip=skip_events, refresh=refresh_events
    )
    if not skip_events:
        added = merge_seed_pdga_events(players, events_cache, division)
        if added:
            events_by_slug = {p.slug: events_cache.get(p.slug, []) for p in players}

    manufacturers = aggregate_by_manufacturer(players)
    mapped = sum(1 for p in players if p.manufacturer != "Unknown")

    affiliated_pool = sum(
        m["points"] for m in manufacturers if m["manufacturer"] != "Unknown"
    )
    for team in manufacturers:
        if team["manufacturer"] != "Unknown":
            team["roster_meta"] = compute_roster_meta(team["players"], affiliated_pool)

    meta = build_division_meta(players, manufacturers)

    week_key = week or "unknown"
    previous = load_previous_snapshot(division, week_key)
    top4 = score_top4(manufacturers)
    full = score_full(manufacturers)
    insights = build_insights(manufacturers, previous)
    save_snapshot(division, week_key, top4, full)

    cup_report = {
        "division": division,
        "week": week,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": STANDINGS_URLS[division],
        "player_count": len(players),
        "mapped_players": mapped,
        "unmapped_players": len(players) - mapped,
        "meta": meta,
        "manufacturers": manufacturers,
        "insights": insights,
        "standings_snapshot": {"top4": top4, "full": full},
    }
    tour_report = build_player_tour_report(division, players, events_by_slug, week)
    save_player_tour_snapshot(division, week_key, tour_report)
    return cup_report, tour_report


def main() -> None:
    args = sys.argv[1:]
    skip_events = "--no-events" in args
    refresh_events = "--refresh-events" in args
    divisions = [arg.upper() for arg in args if not arg.startswith("--")] or ["MPO", "FPO"]
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "title": "DGPT Manufacturers Cup",
        "description": "F1-style constructors championship for disc golf brands",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "divisions": {},
    }

    player_payload = {
        "title": "DGPT Player Tour Stats",
        "description": "Weighted finish rankings across Majors, Elite Series, and A-tiers",
        "scoring": scoring_config(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "divisions": {},
    }

    for division in divisions:
        cup_report, tour_report = build_report(
            division.upper(), skip_events, refresh_events=refresh_events
        )
        payload["divisions"][division.upper()] = cup_report
        player_payload["divisions"][division.upper()] = tour_report

    OUTPUT_FILE.write_text(json.dumps(payload, indent=2))
    print(f"\nSaved {OUTPUT_FILE}")

    PLAYER_TOUR_OUTPUT.write_text(json.dumps(player_payload, indent=2))
    print(f"Saved {PLAYER_TOUR_OUTPUT}")

    timeline = build_timeline()
    TIMELINE_OUTPUT.write_text(json.dumps(timeline, indent=2))
    print(f"Saved {TIMELINE_OUTPUT}")

    dashboard_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "data" / "leaderboards"
    if dashboard_dir.exists():
        (dashboard_dir / "manufacturers_cup.json").write_text(OUTPUT_FILE.read_text())
        (dashboard_dir / "player_tour_stats.json").write_text(PLAYER_TOUR_OUTPUT.read_text())
        (dashboard_dir / "timeline.json").write_text(TIMELINE_OUTPUT.read_text())
        print(f"Synced dashboard data")

    for division, report in payload["divisions"].items():
        print(f"\n{division} Manufacturers Cup:")
        for row in report["manufacturers"][:8]:
            if row["manufacturer"] == "Unknown":
                continue
            print(
                f"  {row['rank']:>2}. {row['manufacturer']:<14} "
                f"{row['points']:>8.1f} pts  ({row['player_count']} players, {row['wins']} wins)"
            )

    for division, report in player_payload["divisions"].items():
        leader = report.get("insights", {}).get("leader")
        print(f"\n{division} Player Tour (weighted): {report['tour_player_count']} players, {report['event_count']} events")
        if leader:
            print(
                f"  Leader: {leader['name']} — {leader['tour_weighted_points']:.0f} pts "
                f"({leader['wins']}W, DGPT #{leader['dgpt_rank']})"
            )
        for row in report["players"][:5]:
            print(
                f"  {row['tour_rank']:>2}. {row['name']:<22} "
                f"{row['tour_weighted_points']:>7.0f} tour pts  (DGPT #{row['dgpt_rank']})"
            )


if __name__ == "__main__":
    main()
