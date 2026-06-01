"""
PropSearch Flask API — used by the Next.js frontend on Vercel.

In production (Railway): gunicorn with 1 sync worker + 300 s timeout.
In local dev: python3 app.py (no secret required when PROPSEARCH_SECRET is unset).

Auth: every route (except /health) requires the header
    Authorization: Bearer <PROPSEARCH_SECRET>
when PROPSEARCH_SECRET is set in the environment.
"""

import os
import re
import sys
import asyncio

from flask import Flask, request, jsonify
from flask_cors import CORS

from scraper import search_properties
from single_scraper import scrape_single_url
from utils.currency import parse_scraped_price, convert
from utils.filters import apply_filters

app = Flask(__name__)
CORS(app)

_SECRET = os.getenv("PROPSEARCH_SECRET", "")


# ── Auth helper ───────────────────────────────────────────────────────────────

def _authorized() -> bool:
    if not _SECRET:
        return True  # local dev without a secret configured
    auth = request.headers.get("Authorization", "")
    return auth == f"Bearer {_SECRET}"


# ── Deduplication (mirrors runner.py logic) ───────────────────────────────────

def _price_to_usd(price_str: str) -> float | None:
    parsed = parse_scraped_price(price_str)
    if parsed is None:
        return None
    amount, currency = parsed
    try:
        return convert(amount, currency, "USD")
    except Exception:
        return None


def _deduplicate(listings: list) -> list:
    """Same-source, same title+location → keep the cheapest price."""
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
            if usd is not None and usd > 10 and (current is None or current <= 10 or usd < current):
                best[key] = {"price_usd": usd, "listing": listing}

    return [best[k]["listing"] for k in order]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Railway health check — no auth required."""
    return jsonify({"status": "ok"})


@app.post("/search")
def search():
    """
    POST /search
    Body: the same params dict that the Next.js frontend sends to /api/propsearch.
    Returns: JSON array of property listings.
    """
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    params = request.get_json(force=True, silent=True) or {}

    # Scrape all requested sources in parallel
    results = search_properties(params)

    # Deduplicate then apply all filters (tipo, city, price, m², bedrooms, etc.)
    results = _deduplicate(results)
    results = apply_filters(results, params)

    return jsonify(results)


@app.post("/scrape-url")
def scrape_url():
    """
    POST /scrape-url
    Body: {"url": "..."}
    Returns: JSON object of property details.
    """
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    params = request.get_json(force=True, silent=True) or {}
    url = params.get("url")
    if not url:
        return jsonify({"error": "Missing URL parameter"}), 400

    try:
        # Run the async scraper synchronously in Flask
        result = asyncio.run(scrape_single_url(url))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=True)
