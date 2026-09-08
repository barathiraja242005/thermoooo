#!/usr/bin/env python3
"""Vastu room placement analyzer (rules aligned with VastuFlow)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

PlacementStatus = Literal["best", "good", "bad", "worst"]

VASTU_PLACEMENT_RULES: dict[str, dict[str, PlacementStatus]] = {
    "Pooja/Mandir": {
        "NE": "good", "ENE": "good", "NNE": "good", "W": "good",
    },
    "Kitchen": {
        "SE": "good", "SSE": "good", "S": "good", "W": "good",
        "NE": "worst",
    },
    "Master Bedroom": {
        "S": "best", "SSW": "best", "SW": "best", "W": "best",
        "NW": "good", "WNW": "worst",
    },
    "Kids Bedroom": {
        "N": "good", "NE": "good", "E": "good", "W": "good",
        "SSW": "worst", "WNW": "worst",
    },
    "Locker": {
        "WSW": "best", "W": "best", "SW": "good",
    },
    "Water Pump/Bore": {
        "N": "good", "NE": "good", "E": "good", "NNE": "good",
    },
    "Toilets": {
        "ESE": "good", "SSW": "good", "WNW": "good",
        "NE": "worst",
    },
    "Study Table": {
        "NE": "best", "N": "good", "E": "good", "WSW": "best",
        "SSW": "worst", "WNW": "worst",
    },
    "Dining Table": {
        "N": "good", "E": "good", "S": "good", "W": "good",
        "SSW": "worst",
    },
    "Office Desk": {
        "W": "best", "N": "good", "E": "good",
        "SSW": "worst", "WNW": "bad",
    },
    "Family Photo": {
        "S": "best", "SW": "best", "NW": "best",
        "SSW": "worst", "WNW": "worst",
    },
    "Overhead Watertank": {
        "SSE": "good", "S": "good", "SSW": "good", "W": "good", "WNW": "good",
        "NE": "worst",
    },
    "Underground Watertank": {
        "N": "good", "NE": "good", "E": "good", "NNE": "good",
    },
    "Entrance": {
        "NNE": "best", "ENE": "best", "S": "best", "W": "best",
        "N": "good", "E": "good", "NW": "good",
        "SW": "worst",
    },
    "Fridge": {
        "SE": "good", "SSE": "good", "S": "good",
        "NE": "worst",
    },
    "Inverter": {
        "SE": "best", "NW": "best",
        "NE": "worst",
    },
    "Dustbin": {
        "ESE": "best", "SSW": "best", "WNW": "best",
        "NE": "worst",
    },
}

STATUS_SCORE = {"best": 100, "good": 80, "bad": 40, "worst": 0, "unknown": 50}


@dataclass
class RoomAnalysis:
    name: str
    vastu_item: str
    direction: str
    status: str
    score: int
    note: str


def analyze_room(name: str, vastu_item: str, direction: str) -> RoomAnalysis:
    rules = VASTU_PLACEMENT_RULES.get(vastu_item, {})
    status = rules.get(direction, "unknown")
    score = STATUS_SCORE.get(status, 50)

    notes = {
        "best": "Ideal placement per classical Vastu",
        "good": "Acceptable placement",
        "bad": "Suboptimal — consider relocation or remedy",
        "worst": "Critical conflict — relocate if possible",
        "unknown": "No specific rule — verify manually",
    }
    return RoomAnalysis(name, vastu_item, direction, status, score, notes[status])


def analyze_property(rooms: list[dict]) -> dict:
    analyses = [
        analyze_room(r["name"], r["vastu_item"], r["direction"])
        for r in rooms
    ]
    avg = round(sum(a.score for a in analyses) / len(analyses)) if analyses else 0
    issues = [a for a in analyses if a.status in ("bad", "worst")]
    return {
        "compliance_score": avg,
        "grade": (
            "Excellent" if avg >= 85
            else "Good" if avg >= 70
            else "Needs improvement" if avg >= 50
            else "Poor"
        ),
        "rooms": [
            {
                "name": a.name,
                "vastu_item": a.vastu_item,
                "direction": a.direction,
                "status": a.status,
                "score": a.score,
                "note": a.note,
            }
            for a in analyses
        ],
        "issues": [
            {"name": a.name, "status": a.status, "note": a.note}
            for a in issues
        ],
    }
