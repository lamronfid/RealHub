#!/usr/bin/env python3
"""
CLI entry point for Next.js: reads JSON params from stdin, writes JSON results to stdout.
All scraper print() logs go to stderr so they don't pollute the JSON output.
"""
import sys
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import json
import re

params = json.loads(sys.stdin.read())

# Redirect print() (scraper logs) to stderr before importing scraper
_real_stdout = sys.stdout
sys.stdout = sys.stderr

from scraper import search_properties
from utils.currency import parse_scraped_price, convert
from utils.filters import apply_filters


def _price_to_usd(price_str: str) -> float | None:
    parsed = parse_scraped_price(price_str)
    if parsed is None:
        return None
    amount, currency = parsed
    try:
        return convert(amount, currency, "USD")
    except Exception:
        return None


def deduplicate(listings: list) -> list:
    """Remove duplicate listings from the same source (same title + location → keep cheapest)."""
    def norm(s: str) -> str:
        return re.sub(r'\s+', ' ', (s or "").lower().strip())

    best: dict = {}
    order: list = []

    for listing in listings:
        key = (
            listing.get("source", ""),
            norm(listing.get("title", "")),
            norm(listing.get("location", "")),
        )
        usd = _price_to_usd(listing.get("price", ""))

        if key not in best:
            best[key] = {"price_usd": usd, "listing": listing}
            order.append(key)
        else:
            current = best[key]["price_usd"]
            # Only treat as "cheaper" when the price is plausible (> $10 USD).
            # Prevents a malformed/zero price from evicting a real one.
            if usd is not None and usd > 10 and (current is None or current <= 10 or usd < current):
                prev = f"{current:.0f}" if current else "?"
                sys.stderr.write(
                    f"  [dedup] cheaper found ({usd:.0f} < {prev} USD): {key[1][:50]}\n"
                )
                best[key] = {"price_usd": usd, "listing": listing}

    return [best[k]["listing"] for k in order]


results = search_properties(params)
results = deduplicate(results)
results = apply_filters(results, params)

sys.stdout = _real_stdout
sys.stdout.write(json.dumps(results, ensure_ascii=False))
sys.stdout.flush()
