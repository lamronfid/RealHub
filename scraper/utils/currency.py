"""
Currency utilities for Propsearch.

Responsibilities:
  - Fetch the live USD→PYG "Venta" (sell) rate from cambioschaco.com.py
  - Cache the rate in cache/exchange_rate.json (refreshed at most once per day)
  - Expose get_usd_to_pyg_rate() and convert()
  - Parse price strings scraped from listings into (amount, currency) pairs
"""

import json
import os
import re
import datetime
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────

CACHE_FILE = Path(__file__).parent.parent / "cache" / "exchange_rate.json"

# Fallback rate used only when no cache exists and fetch fails
FALLBACK_RATE = 7_500.0

# ── Cache helpers ─────────────────────────────────────────────────────────────

def _load_cache() -> dict | None:
    """Return the cached data dict, or None if the file doesn't exist."""
    try:
        if CACHE_FILE.exists():
            return json.loads(CACHE_FILE.read_text())
    except Exception:
        pass
    return None


def _save_cache(rate: float) -> None:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "rate": rate,
        "cached_at": datetime.date.today().isoformat(),
        "source": "cambioschaco.com.py",
    }
    CACHE_FILE.write_text(json.dumps(data, indent=2))


def _cache_is_fresh(cache: dict) -> bool:
    """Return True if the cache was stored today."""
    try:
        return cache.get("cached_at") == datetime.date.today().isoformat()
    except Exception:
        return False

# ── Fetcher ───────────────────────────────────────────────────────────────────

def _fetch_rate_from_web() -> float | None:
    """
    Scrape the USD "Venta" (sell) rate from cambioschaco.com.py.

    The page renders: <h4>Venta:</h4><h2 class="cotiz-actual">6.120 ...</h2>
    We locate the h2 that immediately follows the "Venta:" heading.
    """
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_extra_http_headers({
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                )
            })

            page.goto(
                "https://www.cambioschaco.com.py/perfil-de-moneda/?currency=usd",
                timeout=20_000,
            )
            page.wait_for_timeout(3_000)

            # Primary: grab text from the h2 right after the "Venta:" h4
            # The page has sibling structure: <h4>Venta:</h4> <h2 class="cotiz-actual">6.120
            text = None
            try:
                venta_section = page.locator('h4:has-text("Venta")').first
                cotiz = venta_section.locator('~ h2').first
                text = cotiz.inner_text(timeout=3_000)
            except Exception:
                pass

            # Fallback: regex over the full HTML
            if not text:
                html = page.content()
                m = re.search(
                    r'Venta:[^<]*</h4>\s*<h2[^>]*>([\d][\d.,]*)',
                    html,
                )
                if m:
                    text = m.group(1)

            browser.close()

        if text:
            raw = re.sub(r'[^\d.,]', '', text.strip())
            return _parse_rate_string(raw)

    except Exception as e:
        logger.warning("Exchange rate fetch failed: %s", e)

    return None


def _parse_rate_string(raw: str) -> float | None:
    """
    Convert a rate string like '6.120' or '6,120' to 6120.0.
    The site uses dots as thousand separators (PY convention).
    """
    try:
        # Strip everything except digits and separators
        cleaned = re.sub(r'[^\d.,]', '', raw)
        # Dots-only → thousand separators → strip dots
        if '.' in cleaned and ',' not in cleaned:
            val = float(cleaned.replace('.', ''))
        # Commas-only → thousand separators → strip commas
        elif ',' in cleaned and '.' not in cleaned:
            val = float(cleaned.replace(',', ''))
        else:
            val = float(cleaned)
        if 1_000 < val < 100_000:   # sanity range for PYG/USD rate
            return val
    except Exception:
        pass
    return None

# ── Public API ────────────────────────────────────────────────────────────────

def get_usd_to_pyg_rate() -> tuple[float, bool, str | None]:
    """
    Return (rate, is_cached, cached_at_date).

    - Reads the cache first; uses it if it's from today.
    - Otherwise fetches from the web and updates the cache.
    - If the web fetch fails, falls back to the last cached value (or FALLBACK_RATE).

    Returns:
        rate (float):           The USD→PYG exchange rate.
        is_cached (bool):       True if the returned rate came from cache (not a fresh fetch).
        cached_at (str|None):   ISO date string of when the cached value was stored.
    """
    cache = _load_cache()

    # Use today's cached value if available
    if cache and _cache_is_fresh(cache):
        return cache["rate"], True, cache.get("cached_at")

    # Try to fetch a fresh rate
    logger.info("Fetching fresh USD/PYG exchange rate...")
    fresh = _fetch_rate_from_web()

    if fresh:
        _save_cache(fresh)
        return fresh, False, datetime.date.today().isoformat()

    # Fall back to whatever is in cache (even if stale)
    if cache:
        logger.warning(
            "Exchange rate fetch failed — using stale cache from %s (rate: %s)",
            cache.get("cached_at"), cache.get("rate"),
        )
        return cache["rate"], True, cache.get("cached_at")

    # Last resort
    logger.warning("No cache and fetch failed — using hardcoded fallback rate %s", FALLBACK_RATE)
    return FALLBACK_RATE, True, None


def convert(amount: float, from_currency: str, to_currency: str) -> float:
    """
    Convert amount between 'USD' and 'PYG'.
    Uses today's cached rate (fetches if needed).
    """
    fc = from_currency.upper()
    tc = to_currency.upper()
    if fc == tc:
        return amount
    rate, _, _ = get_usd_to_pyg_rate()
    if fc == "USD" and tc == "PYG":
        return amount * rate
    if fc == "PYG" and tc == "USD":
        return amount / rate
    raise ValueError(f"Unsupported currency pair: {from_currency} → {to_currency}")

# ── Price string parser ───────────────────────────────────────────────────────

def parse_scraped_price(price_str: str) -> tuple[float, str] | None:
    """
    Parse a raw price string from a scraped listing.

    Returns (amount, currency) where currency is 'USD' or 'PYG',
    or None if the price cannot be parsed (e.g. 'Consultar').

    Handles formats like:
        "Gs. 750.000.000"   → (750_000_000, 'PYG')
        "₲ 9.000.000"       → (9_000_000,   'PYG')
        "$198,000"           → (198_000,     'USD')
        "USD 450,000"        → (450_000,     'USD')
        "2,500,000 ₲"        → (2_500_000,   'PYG')
        "USD 1.200.000"      → (1_200_000,   'USD')  ← some sites use dots for USD
    """
    if not price_str or price_str.strip().lower() in ("consultar", "a consultar", ""):
        return None

    p = price_str.upper()

    # Detect currency from symbols / words
    is_pyg = any(tok in p for tok in ("₲", "GS", "PYG", "GUARANI", "GUARANÍ"))
    is_usd = any(tok in p for tok in ("$", "USD", "US$", "DOLAR", "DÓLAR"))

    # Strip everything except digits, dots, commas; then drop any leading
    # separator left by prefixes like "Gs." → ".5.000.000" → "5.000.000"
    digits = re.sub(r"[^\d.,]", "", price_str).lstrip(".,")
    if not digits:
        return None

    amount = _normalize_number(digits)
    if amount is None or amount <= 0:
        return None

    # Determine currency: PYG amounts are typically >> 1_000_000
    if is_pyg:
        return amount, "PYG"
    if is_usd:
        return amount, "USD"

    # Heuristic when no explicit symbol: PYG rates are in the millions
    if amount >= 1_000_000:
        return amount, "PYG"
    return amount, "USD"


def _normalize_number(digits: str) -> float | None:
    """
    Turn a digit string with thousand separators into a float.
    Handles both European (1.000.000) and American (1,000,000) styles.
    """
    try:
        if "." in digits and "," not in digits:
            parts = digits.split(".")
            # All segments after the first are length 3 → thousand separators
            if all(len(p) == 3 for p in parts[1:]):
                return float(digits.replace(".", ""))
            # Otherwise treat the last dot as decimal
            return float(digits)

        if "," in digits and "." not in digits:
            parts = digits.split(",")
            if all(len(p) == 3 for p in parts[1:]):
                return float(digits.replace(",", ""))
            return float(digits.replace(",", "."))

        if "." in digits and "," in digits:
            last_dot = digits.rfind(".")
            last_comma = digits.rfind(",")
            if last_dot > last_comma:
                # American: 1,234.56
                return float(digits.replace(",", ""))
            # European: 1.234,56
            return float(digits.replace(".", "").replace(",", "."))

        return float(digits)
    except Exception:
        return None


def price_in_range(
    price_str: str,
    min_price: float | None,
    max_price: float | None,
    filter_currency: str,
) -> bool:
    """
    Return True if the scraped price falls within [min_price, max_price]
    (both expressed in filter_currency).

    Converts as needed using today's rate.
    Listings with unparseable prices always pass through (True).
    """
    if min_price is None and max_price is None:
        return True

    parsed = parse_scraped_price(price_str)
    if parsed is None:
        return True   # can't parse → don't filter out

    amount, listing_currency = parsed

    # Convert to the currency the user is filtering in
    try:
        comparable = convert(amount, listing_currency, filter_currency)
    except Exception:
        return True

    if min_price is not None and comparable < min_price:
        return False
    if max_price is not None and comparable > max_price:
        return False
    return True
