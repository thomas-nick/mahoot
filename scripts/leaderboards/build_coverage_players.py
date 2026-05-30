#!/usr/bin/env python3
"""Aggregate coverage_results into per-player profiles (Elite + Major finishes)."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
RESULTS_DIR = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_results"
COVERAGE_CATALOG = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_catalog.json"
PLAYERS_DIR = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_players"
INDEX_OUT = PLAYERS_DIR / "index.json"

TOUR_TAG_LABELS = {
    "major": "Major",
    "dgpt_elite": "DGPT Elite",
    "nt": "PDGA NT",
    "jomez_tour": "Jomez Tour",
    "go_throw_tour": "Go Throw Tour",
}


def clean_name(name: str) -> str:
    return re.sub(r"\s+#\d+$", "", name).strip()


def player_tag(name: str) -> str:
    s = clean_name(name).lower()
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s[:64] or "unknown"


def load_coverage_event_ids() -> set[str]:
    if not COVERAGE_CATALOG.exists():
        return set()
    catalog = json.loads(COVERAGE_CATALOG.read_text())
    return {e["id"] for e in catalog.get("events", []) if e.get("id")}


def load_event_results() -> list[dict]:
    events = []
    for path in sorted(RESULTS_DIR.glob("*.json")):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text())
        if data.get("coverage_event_id"):
            events.append(data)
    return events


def aggregate(events: list[dict], coverage_ids: set[str]) -> dict[int, dict]:
    by_pdga: dict[int, dict] = {}

    for ev in events:
        cov_id = ev["coverage_event_id"]
        title = ev.get("title") or cov_id.replace("_", " ")
        year = str(ev.get("year") or "")
        tour_tag = ev.get("tour_tag")
        has_coverage = cov_id in coverage_ids

        for division in ("mpo", "fpo"):
            for row in ev.get(division) or []:
                pdga = row.get("pdga")
                if not pdga:
                    continue
                name = clean_name(row.get("name") or f"PDGA {pdga}")
                place = int(row.get("place") or 0)
                entry = {
                    "coverage_event_id": cov_id,
                    "title": title,
                    "year": year,
                    "tour_tag": tour_tag,
                    "tour_tag_label": TOUR_TAG_LABELS.get(tour_tag) if tour_tag else None,
                    "division": row.get("division") or division.upper(),
                    "place": place,
                    "pdga_points": row.get("pdga_points") or 0,
                    "rating": row.get("rating"),
                    "prize": row.get("prize") or "",
                    "score": row.get("score"),
                    "has_coverage": has_coverage,
                }

                slot = by_pdga.setdefault(
                    pdga,
                    {
                        "pdga": pdga,
                        "name": name,
                        "division": entry["division"],
                        "rating": row.get("rating"),
                        "results": [],
                    },
                )
                if name and len(name) > len(slot.get("name") or ""):
                    slot["name"] = name
                if row.get("rating") and (slot.get("rating") is None or row["rating"] > slot["rating"]):
                    slot["rating"] = row["rating"]
                slot["results"].append(entry)

    return by_pdga


def compute_streaks(results: list[dict]) -> dict:
    if not results:
        return {}

    current_win = 0
    for r in results:
        if r["place"] == 1:
            current_win += 1
        else:
            break

    current_podium = 0
    for r in results:
        if r["place"] <= 3:
            current_podium += 1
        else:
            break

    current_top10 = 0
    for r in results:
        if r["place"] <= 10:
            current_top10 += 1
        else:
            break

    winless = 0
    if results[0]["place"] != 1:
        for r in results:
            if r["place"] == 1:
                break
            winless += 1

    chron = sorted(results, key=lambda r: (r.get("year") or "", r.get("coverage_event_id") or ""))

    def max_streak(predicate) -> int:
        best = current = 0
        for r in chron:
            if predicate(r):
                current += 1
                best = max(best, current)
            else:
                current = 0
        return best

    recent = results[:5]
    form_avg = sum(r["place"] for r in recent) / len(recent) if recent else None

    return {
        "current_win_streak": current_win,
        "current_podium_streak": current_podium,
        "current_top10_streak": current_top10,
        "winless_streak": winless,
        "best_win_streak": max_streak(lambda r: r["place"] == 1),
        "best_podium_streak": max_streak(lambda r: r["place"] <= 3),
        "form_avg_finish": round(form_avg, 1) if form_avg is not None else None,
        "form_events": len(recent),
    }


def load_media_stats_by_tag() -> dict[str, dict]:
    path = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_media_stats" / "index.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    return {p["name_tag"]: p for p in data.get("players") or [] if p.get("name_tag")}


def finalize_player(raw: dict, media_by_tag: dict[str, dict]) -> dict:
    results = sorted(
        raw["results"],
        key=lambda r: (r.get("year") or "", -r.get("pdga_points", 0), r.get("place") or 99),
        reverse=True,
    )
    wins = sum(1 for r in results if r["place"] == 1)
    podiums = sum(1 for r in results if r["place"] <= 3)
    top10 = sum(1 for r in results if r["place"] <= 10)
    pdga_points = sum(r.get("pdga_points") or 0 for r in results)
    years = [r["year"] for r in results if r.get("year")]
    divisions = [r["division"] for r in results]
    division = max(set(divisions), key=divisions.count) if divisions else "MPO"
    tag = player_tag(raw["name"])
    streaks = compute_streaks(results)
    media = media_by_tag.get(tag)

    chron = sorted(results, key=lambda r: (r.get("year") or "", r.get("coverage_event_id") or ""))
    finish_history = [r["place"] for r in chron if r.get("place")][-12:]

    out = {
        "pdga": raw["pdga"],
        "name": raw["name"],
        "name_tag": tag,
        "division": division,
        "rating": raw.get("rating"),
        "events_played": len(results),
        "wins": wins,
        "podiums": podiums,
        "top10": top10,
        "pdga_points": round(pdga_points, 1),
        "last_event_year": max(years) if years else None,
        "first_event_year": min(years) if years else None,
        "finish_history": finish_history,
        "results": results,
        **streaks,
    }
    if media:
        out["media"] = {
            "rounds": media["rounds"],
            "lead_cards": media["lead_cards"],
            "chase_cards": media["chase_cards"],
            "feature_cards": media["feature_cards"],
            "tournaments": media["tournaments"],
            "multi_source_events": media["multi_source_events"],
            "by_source": media.get("by_source") or {},
        }
    return out


def main() -> None:
    coverage_ids = load_coverage_event_ids()
    events = load_event_results()
    if not events:
        raise SystemExit(f"No event results in {RESULTS_DIR} — run elite_results.py first.")

    raw = aggregate(events, coverage_ids)
    media_by_tag = load_media_stats_by_tag()
    players = [finalize_player(p, media_by_tag) for p in raw.values()]
    players.sort(key=lambda p: (-p["wins"], -p["podiums"], -p["pdga_points"], p["name"]))

    PLAYERS_DIR.mkdir(parents=True, exist_ok=True)
    for p in players:
        (PLAYERS_DIR / f"{p['pdga']}.json").write_text(
            json.dumps(p, indent=2, ensure_ascii=False)
        )

    name_index = {p["name_tag"]: p["pdga"] for p in players}
    index = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "player_count": len(players),
        "event_count": len(events),
        "name_index": name_index,
        "players": [
            {
                "pdga": p["pdga"],
                "name": p["name"],
                "name_tag": p["name_tag"],
                "division": p["division"],
                "rating": p["rating"],
                "events_played": p["events_played"],
                "wins": p["wins"],
                "podiums": p["podiums"],
                "top10": p["top10"],
                "pdga_points": p["pdga_points"],
                "last_event_year": p["last_event_year"],
                "current_win_streak": p.get("current_win_streak", 0),
                "current_podium_streak": p.get("current_podium_streak", 0),
                "form_avg_finish": p.get("form_avg_finish"),
                "finish_history": p["finish_history"],
                "media_rounds": (p.get("media") or {}).get("rounds"),
                "media_lead_cards": (p.get("media") or {}).get("lead_cards"),
            }
            for p in players
        ],
    }
    INDEX_OUT.write_text(json.dumps(index, indent=2, ensure_ascii=False))
    top = ", ".join(f"{p['name']} ({p['wins']}W)" for p in players[:5])
    print(f"Wrote {len(players)} player profiles → {PLAYERS_DIR}")
    print(f"  Top by wins: {top}")


if __name__ == "__main__":
    main()
