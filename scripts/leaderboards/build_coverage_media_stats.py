#!/usr/bin/env python3
"""Aggregate YouTube coverage catalog into per-player media stats."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
COVERAGE_CATALOG = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_catalog.json"
PLAYERS_INDEX = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_players" / "index.json"
OUTPUT_DIR = SCRIPT_DIR.parent.parent / "frontend" / "public" / "data" / "coverage_media_stats"
INDEX_OUT = OUTPUT_DIR / "index.json"


def clean_name(name: str) -> str:
    return re.sub(r"\s+#\d+$", "", name).strip()


def player_tag(name: str) -> str:
    s = clean_name(name).lower()
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s[:64] or "unknown"


def load_name_index() -> dict[str, int]:
    if not PLAYERS_INDEX.exists():
        return {}
    data = json.loads(PLAYERS_INDEX.read_text())
    return {k: int(v) for k, v in (data.get("name_index") or {}).items()}


def load_division_by_tag() -> dict[str, str]:
    if not PLAYERS_INDEX.exists():
        return {}
    data = json.loads(PLAYERS_INDEX.read_text())
    out: dict[str, str] = {}
    for p in data.get("players") or []:
        tag = p.get("name_tag")
        div = p.get("division")
        if tag and div:
            out[tag] = div
    return out


def aggregate(catalog: dict) -> list[dict]:
    by_tag: dict[str, dict] = {}

    for event in catalog.get("events") or []:
        event_id = event.get("id") or ""
        multi = bool(event.get("multi_source"))

        for row in event.get("round_rows") or []:
            for source, cells in (row.get("cells") or {}).items():
                if not cells:
                    continue
                for cell in cells:
                    card_type = (cell.get("card_type") or "unknown").lower()
                    for raw_name in cell.get("players") or []:
                        tag = player_tag(raw_name)
                        if not tag:
                            continue
                        slot = by_tag.setdefault(
                            tag,
                            {
                                "name_tag": tag,
                                "name": clean_name(raw_name),
                                "rounds": 0,
                                "lead_cards": 0,
                                "chase_cards": 0,
                                "feature_cards": 0,
                                "tournaments": set(),
                                "multi_source_events": set(),
                                "by_source": defaultdict(int),
                            },
                        )
                        if len(clean_name(raw_name)) > len(slot["name"]):
                            slot["name"] = clean_name(raw_name)
                        slot["rounds"] += 1
                        slot["tournaments"].add(event_id)
                        if multi:
                            slot["multi_source_events"].add(event_id)
                        slot["by_source"][source] += 1
                        if card_type == "lead":
                            slot["lead_cards"] += 1
                        elif card_type == "chase":
                            slot["chase_cards"] += 1
                        elif card_type == "feature":
                            slot["feature_cards"] += 1

    name_index = load_name_index()
    division_by_tag = load_division_by_tag()
    players = []
    for tag, raw in by_tag.items():
        players.append(
            {
                "name_tag": tag,
                "name": raw["name"],
                "pdga": name_index.get(tag),
                "division": division_by_tag.get(tag),
                "rounds": raw["rounds"],
                "lead_cards": raw["lead_cards"],
                "chase_cards": raw["chase_cards"],
                "feature_cards": raw["feature_cards"],
                "tournaments": len(raw["tournaments"]),
                "multi_source_events": len(raw["multi_source_events"]),
                "by_source": dict(sorted(raw["by_source"].items())),
            }
        )

    players.sort(key=lambda p: (-p["rounds"], -p["lead_cards"], p["name"]))
    return players


def main() -> None:
    if not COVERAGE_CATALOG.exists():
        raise SystemExit(f"Missing catalog: {COVERAGE_CATALOG}")

    catalog = json.loads(COVERAGE_CATALOG.read_text())
    players = aggregate(catalog)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    index = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "player_count": len(players),
        "event_count": len(catalog.get("events") or []),
        "players": players,
    }
    INDEX_OUT.write_text(json.dumps(index, indent=2, ensure_ascii=False))

    top = ", ".join(f"{p['name']} ({p['rounds']}r)" for p in players[:5])
    print(f"Wrote {len(players)} media profiles → {INDEX_OUT}")
    print(f"  Most filmed: {top}")


if __name__ == "__main__":
    main()
