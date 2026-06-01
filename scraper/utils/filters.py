"""
Property listing filters — shared between runner.py (post-scrape, final pass)
and scraper.py (per-page, inside the pagination loop so we stop scraping once
we have enough matched results).
"""

import re
import sys
import unicodedata
from datetime import date, timedelta

from utils.currency import price_in_range
from utils.locations import scan_city_in_text, scan_barrio_city_in_text, _CITY_NORM_TO_CANONICAL


def _strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )


def _norm(s: str) -> str:
    """Lowercase and strip diacritics — used for tipo comparisons."""
    return _strip_accents(s.lower())


_TIPO_KEYWORDS: dict[str, tuple[str, ...]] = {
    "casa":              ("casa", "chalet", "bungalow", "residencia", "vivienda", "townhouse", "cabaña"),
    "departamento":      ("departamento", "depto", "dpto", "dpt.", "apartamento", "apto", "aptn", "piso",
                          "monoambiente", "studio", "flat", "loft", "suite", "penthouse"),
    "dúplex":            ("dúplex", "duplex"),
    "duplex":            ("dúplex", "duplex"),
    "quinta/country":    ("quinta", "country", "barrio cerrado", "condominio", "chalet"),
    "terreno":           ("terreno", "lote", "parcela", "solar", "baldío", "baldio", "predio",
                          "fraccion", "fracción", "fraccionamiento"),
    "terreno/lote":      ("terreno", "lote", "parcela", "solar", "baldío", "baldio", "predio",
                          "fraccion", "fracción", "fraccionamiento"),
    "estancia/campo":    ("estancia", "campo", "hacienda", "chacra", "finca", "rancho", "huerta"),
    "local comercial":   ("local", "comercial", "galpon", "galpón", "deposito", "depósito",
                          "nave", "showroom", "bodega", "retail"),
    "local_comercial":   ("local", "comercial", "galpon", "galpón", "deposito", "depósito",
                          "nave", "showroom", "bodega", "retail"),
    "oficina":           ("oficina", "despacho", "consultorio"),
    "depósito/tinglado": ("deposito", "depósito", "tinglado", "galpon", "galpón", "nave", "bodega"),
    "industria":         ("industria", "industrial", "fabrica", "fábrica", "planta"),
    "alojamiento":       ("hotel", "hostal", "hostel", "apart hotel", "motel", "alojamiento"),
    "edificio":          ("edificio", "torre"),
}

_ESTADO_OBRA_KEYWORDS: dict[str, tuple[str, ...]] = {
    "pozo":         ("en pozo", "pre-venta", "preventa", "desde pozo", "en preventa", "a estrenar en pozo"),
    "construccion": ("en construcción", "en obra", "en construccion", "en construcción", "en ejecución"),
    "terminado":    ("a estrenar", "terminado", "listo para habitar", "entrega inmediata", "llave en mano",
                     "obra terminada"),
}

# Pre-normalised (lowercase + accent-stripped) keyword tuples for fast matching.
_TIPO_KEYWORDS_NORM: dict[str, tuple[str, ...]] = {
    t: tuple(_norm(k) for k in kws)
    for t, kws in _TIPO_KEYWORDS.items()
}

# Structural aliases: canonical form used for Tier 1 comparison only.
# Handles slash vs underscore variants and the terreno/terreno-lote equivalence.
# Note: accent variants (dúplex/duplex, depósito/deposito) are already handled
# by _norm() which strips accents, so no alias entry needed for those.
_TIPO_ALIASES: dict[str, str] = {
    "terreno/lote":    "terreno",
    "local_comercial": "local comercial",
}


def _canonical_tipo(s: str) -> str:
    """Normalise a tipo string to its canonical form for Tier 1 comparison."""
    n = _norm(s)
    return _TIPO_ALIASES.get(n, n)


def _scan_tipo_in_text(
    text_norm: str,
    req_norm: str,
    req_kws_norm: tuple[str, ...],
) -> tuple[str, str]:
    """
    Scan normalised text for tipo keywords.

    Returns (signal, keyword) where signal is:
      "match"     — a keyword for the requested tipo was found
      "contradict" — a keyword exclusive to a DIFFERENT tipo was found
      "none"      — no tipo keyword found at all
    """
    # Positive match: any keyword belonging to the requested tipo
    for kw in req_kws_norm:
        if kw in text_norm:
            return "match", kw

    # Contradiction: a keyword that belongs to another tipo and is NOT shared
    # with the requested tipo's keyword set (shared keywords can't be evidence
    # of the wrong type — e.g. "chalet" appears in both "casa" and "quinta/country").
    req_kw_set = set(req_kws_norm)
    for other_req, other_kws_norm in _TIPO_KEYWORDS_NORM.items():
        if _canonical_tipo(other_req) == req_norm:
            continue  # skip aliases of the same canonical type
        for kw in other_kws_norm:
            if kw not in req_kw_set and kw in text_norm:
                return "contradict", kw

    return "none", ""


def _matches_tipo(listing: dict, tipo: str) -> bool:
    """
    Tiered tipo verification. Returns True to KEEP, False to DROP.

    Tier 1 — structured field (listing['tipo']): ground truth if present.
              Match → KEEP immediately. Mismatch → DROP (no fallback to title).
    Tier 2 — title keywords: scan for tipo keywords.
              Positive hit → KEEP. Contradicting keyword → DROP.
    Tier 3 — URL slug keywords: same scan on the listing URL.
    Tier 4 — no tipo signal anywhere → KEEP (inclusive fallback).
              Absence of evidence is not evidence of wrong tipo.
    """
    req     = tipo.lower()
    req_norm = _canonical_tipo(req)
    req_kws_norm = _TIPO_KEYWORDS_NORM.get(req)
    if not req_kws_norm:
        # Unrecognised tipo — no keyword set, can't filter meaningfully
        return True

    title = (listing.get("title") or "").strip()
    short = title[:50]

    # ── Tier 1: structured field ────────────────────────────────────────────
    structured = listing.get("tipo")
    if structured:
        s_norm = _canonical_tipo(structured)
        if s_norm == req_norm:
            sys.stderr.write(
                f"  [filters] {short!r} tipo tier=1 field={structured!r}"
                f" req={tipo!r} → KEEP\n"
            )
            return True
        else:
            sys.stderr.write(
                f"  [filters] {short!r} tipo tier=1 field={structured!r}"
                f" req={tipo!r} → DROP\n"
            )
            return False

    # ── Tier 2: title keyword scan ──────────────────────────────────────────
    title_norm = _norm(title)
    signal, kw = _scan_tipo_in_text(title_norm, req_norm, req_kws_norm)
    if signal == "match":
        sys.stderr.write(
            f"  [filters] {short!r} tipo tier=2 title={kw!r} req={tipo!r} → KEEP\n"
        )
        return True
    if signal == "contradict":
        sys.stderr.write(
            f"  [filters] {short!r} tipo tier=2 title={kw!r} vs req={tipo!r} → DROP\n"
        )
        return False

    # ── Tier 3: URL slug scan ───────────────────────────────────────────────
    url_norm = _norm(listing.get("url") or "")
    signal, kw = _scan_tipo_in_text(url_norm, req_norm, req_kws_norm)
    if signal == "match":
        sys.stderr.write(
            f"  [filters] {short!r} tipo tier=3 url={kw!r} req={tipo!r} → KEEP\n"
        )
        return True
    if signal == "contradict":
        sys.stderr.write(
            f"  [filters] {short!r} tipo tier=3 url={kw!r} vs req={tipo!r} → DROP\n"
        )
        return False

    # ── Tier 4: no tipo signal found ────────────────────────────────────────
    sys.stderr.write(
        f"  [filters] {short!r} tipo tier=4 no signal → KEEP (inclusive)\n"
    )
    return True


def _matches_city(listing: dict, requested_city: str) -> bool:
    """
    Tiered city verification. Returns True to KEEP, False to DROP.

    Tier 1 — structured field (listing['ciudad']): canonical match → KEEP/DROP.
    Tier 2 — scan listing location text for a known CITY name.
              Found + matches → KEEP. Found + different city → DROP.
    Tier 3 — scan location text for a unique BARRIO name; resolve to city.
              Same logic as Tier 2, applied to the resolved city.
    Tier 4 — no city signal (including unrecognised barrios) → KEEP (inclusive).
              Never drop on absence of evidence.
    """
    req_norm = _norm(requested_city)
    location = (listing.get("location") or "").strip()

    # ── Tier 1: structured field ────────────────────────────────────────────
    structured = listing.get("ciudad")
    if structured:
        s_norm = _norm(structured)
        if s_norm == req_norm:
            sys.stderr.write(
                f"  [filters] city check {location!r} → ciudad={structured!r}"
                f" req={requested_city!r} → KEEP\n"
            )
            return True
        else:
            sys.stderr.write(
                f"  [filters] city check {location!r} → ciudad={structured!r}"
                f" ≠ req={requested_city!r} → DROP\n"
            )
            return False

    # ── Tier 2: scan location for a known city name ─────────────────────────
    found_city = scan_city_in_text(location)
    if found_city:
        found_norm = _norm(found_city)
        if found_norm == req_norm:
            sys.stderr.write(
                f"  [filters] city check {location!r} → city={found_city!r}"
                f" req={requested_city!r} → KEEP\n"
            )
            return True
        else:
            sys.stderr.write(
                f"  [filters] city check {location!r} → city={found_city!r}"
                f" ≠ req={requested_city!r} → DROP\n"
            )
            return False

    # ── Tier 3: scan location for a unique barrio → resolve to city ─────────
    barrio_city = scan_barrio_city_in_text(location)
    if barrio_city:
        barrio_norm = _norm(barrio_city)
        if barrio_norm == req_norm:
            sys.stderr.write(
                f"  [filters] city check {location!r} → barrio→{barrio_city!r}"
                f" req={requested_city!r} → KEEP\n"
            )
            return True
        else:
            sys.stderr.write(
                f"  [filters] city check {location!r} → barrio→{barrio_city!r}"
                f" ≠ req={requested_city!r} → DROP\n"
            )
            return False

    # ── Tier 4: no city signal ──────────────────────────────────────────────
    sys.stderr.write(
        f"  [filters] city check {location!r} → no signal → KEEP (inclusive)\n"
    )
    return True


def _matches_estado_obra(listing: dict, estados: list) -> bool:
    if not estados:
        return True
    text = f"{listing.get('title', '')} {listing.get('location', '')}".lower()
    # Inclusive: listings with no status keywords pass through regardless of filter.
    any_keyword_present = any(kw in text for kws in _ESTADO_OBRA_KEYWORDS.values() for kw in kws)
    if not any_keyword_present:
        return True
    return any(
        any(kw in text for kw in _ESTADO_OBRA_KEYWORDS.get(e, ()))
        for e in estados
    )


def _matches_metraje(
    listing: dict,
    m2c_min: float | None = None,
    m2c_max: float | None = None,
    m2t_min: float | None = None,
    m2t_max: float | None = None,
) -> bool:
    def _in_range(val, mn, mx) -> bool:
        if val is None:
            return True  # no data → pass through rather than silently hide
        if mn is not None and float(val) < mn:
            return False
        if mx is not None and float(val) > mx:
            return False
        return True

    # All scrapers emit "metros" as their m² field.
    # The more-specific keys (m2_construido, m2_terreno, MetersSquared*) are kept
    # as primary lookups for any source that may supply them in the future.
    metros_fallback = listing.get("metros")

    if m2c_min is not None or m2c_max is not None:
        m2c = (
            listing.get("m2_construido")
            or listing.get("MetersSquaredConstructed")
            or metros_fallback
        )
        if m2c is not None:
            try:
                if not _in_range(float(m2c), m2c_min, m2c_max):
                    return False
            except (ValueError, TypeError):
                pass

    if m2t_min is not None or m2t_max is not None:
        m2t = (
            listing.get("m2_terreno")
            or listing.get("MetersSquared")
            or metros_fallback
        )
        if m2t is not None:
            try:
                if not _in_range(float(m2t), m2t_min, m2t_max):
                    return False
            except (ValueError, TypeError):
                pass

    return True


_BED_PATTERN = re.compile(
    r'(\d+)\s*(?:dormitorio|dormit|dorm\.?|habitaci[oó]n|habitaci|hab\.?|ambiente|suite|cuarto)',
    re.IGNORECASE,
)
_MONO_KEYWORDS = ("monoambiente", "studio", "loft", " flat ", "1 ambiente", "un ambiente")


def _extract_bedrooms(title: str) -> int | None:
    m = _BED_PATTERN.search(title)
    return int(m.group(1)) if m else None


def _matches_bedrooms_single(listing: dict, bed_val: str) -> bool:
    """Check one bedroom criterion: "0"=mono, "1"-"4"=exact, "5+"=gte."""
    bed_val = str(bed_val).strip()
    if not bed_val:
        return True

    title = listing.get("title", "").lower()
    is_mono_by_title = any(k in title for k in _MONO_KEYWORDS)
    is_mono_filter   = bed_val == "0"
    is_plus_filter   = bed_val.endswith("+")

    structured = listing.get("bedrooms")
    if structured is not None:
        n = int(structured)
        if is_mono_filter:
            return n == 0 or is_mono_by_title
        if is_plus_filter:
            return n >= int(bed_val.rstrip("+"))
        return n == int(bed_val)

    n = _extract_bedrooms(title)
    if n is None:
        if is_mono_filter:
            return is_mono_by_title
        if is_mono_by_title:
            return False  # clearly monoambiente → exclude from N+ searches
        return True       # can't determine → pass through
    if is_mono_filter:
        return n == 0 or is_mono_by_title
    if is_plus_filter:
        return n >= int(bed_val.rstrip("+"))
    return n == int(bed_val)


def _matches_bedrooms(listing: dict, beds: list) -> bool:
    if not beds:
        return True
    return any(_matches_bedrooms_single(listing, b) for b in beds)


def _is_fresh(listing: dict, is_alquiler: bool) -> bool:
    """Return False when the listing has a known creation date older than the cutoff.
    Listings with no date pass through (we can't confirm staleness)."""
    listed_at = listing.get("listed_at")
    if not listed_at:
        return True
    try:
        listed = date.fromisoformat(str(listed_at))
        max_age = timedelta(days=110 if is_alquiler else 730)
        return listed >= date.today() - max_age
    except (ValueError, TypeError):
        return True


def _parse_m2_param(value) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (ValueError, TypeError):
        return None


# Normalised barrio name → list of known alternate spellings / abbreviations
_BARRIO_ALIASES: dict[str, list[str]] = {
    "madame lynch": ["mme. lynch", "mme lynch", "mdme. lynch", "mdme lynch", "madame lynch"],
    "mcal. lopez":  ["mariscal lopez", "mariscal lopez", "mcal. lopez", "mcal lopez"],
    "gral. diaz":   ["general diaz", "general diaz", "gral diaz"],
}


def _barrio_variants(b: str) -> list[str]:
    """Return normalised barrio name plus all known aliases."""
    norm = _strip_accents(b.lower())
    return [norm] + [_strip_accents(a) for a in _BARRIO_ALIASES.get(norm, [])]


def apply_filters(listings: list, params: dict) -> list:
    """
    Return the subset of listings that match all active search filters.
    Safe to call multiple times on the same listing (idempotent).
    """
    tipo_legacy = params.get("propType", "")
    prop_types  = [t.strip() for t in (params.get("propTypes") or []) if str(t).strip()]
    if not prop_types and tipo_legacy:
        prop_types = [tipo_legacy]

    min_price = params.get("min_price")
    max_price = params.get("max_price")
    currency  = (params.get("currency") or "USD").upper()
    barrios   = [b.strip() for b in (params.get("barrios") or []) if b.strip()]
    beds_raw  = params.get("bedrooms")
    if isinstance(beds_raw, list):
        bedrooms = [str(b).strip() for b in beds_raw if str(b).strip()]
    elif beds_raw:
        bedrooms = [str(beds_raw).strip()]
    else:
        bedrooms = []
    estados   = [e.strip() for e in (params.get("estadoObra") or []) if str(e).strip()]

    m2c_min = _parse_m2_param(params.get("m2ConstruidoMin"))
    m2c_max = _parse_m2_param(params.get("m2ConstruidoMax"))
    m2t_min = _parse_m2_param(params.get("m2TerrenoMin"))
    m2t_max = _parse_m2_param(params.get("m2TerrenoMax"))

    min_price = float(min_price) if min_price not in (None, "") else None
    max_price = float(max_price) if max_price not in (None, "") else None

    op_requested = params.get("operation", "").lower()
    is_alquiler  = "alquil" in op_requested or "arriend" in op_requested

    city_req        = (params.get("location") or "").strip()
    # Only activate the city filter when the location is a known city in our map.
    # Unknown locations (e.g. free-text addresses) fall through without filtering.
    city_filter_on  = bool(city_req and _norm(city_req) in _CITY_NORM_TO_CANONICAL)

    kept            = []
    tipo_in         = 0
    tipo_dropped    = 0
    city_in         = 0
    city_dropped    = 0

    for r in listings:
        title    = r.get("title") or ""
        price    = r.get("price") or ""
        location = r.get("location") or ""

        # Drop dual-operation listings (e.g. "Venta o Alquiler") when a specific
        # operation was requested — these are ambiguous and pollute results.
        if op_requested:
            combined = f"{title} {price} {location}".lower()
            has_rent = any(k in combined for k in ("alquil", "arrend", "arriendo"))
            has_sale = any(k in combined for k in ("venta", "se vende", "vendo "))
            if has_rent and has_sale:
                sys.stderr.write(f"  [skip-dual-op] {title[:60]}\n")
                continue

        if prop_types:
            tipo_in += 1
            # _matches_tipo() runs for all sites — the old bypass that trusted
            # URL-filtered sites unconditionally has been removed. Tipo verification
            # now uses a 4-tier system (structured field → title → URL → inclusive).
            if not any(_matches_tipo(r, t) for t in prop_types):
                sys.stderr.write(f"  [skip-tipo] {title[:70]}\n")
                tipo_dropped += 1
                continue

        if city_filter_on:
            city_in += 1
            if not _matches_city(r, city_req):
                sys.stderr.write(f"  [skip-city] {title[:60]}\n")
                city_dropped += 1
                continue

        if not _is_fresh(r, is_alquiler):
            sys.stderr.write(f"  [skip-stale] {title[:60]} (listed {r.get('listed_at', '?')})\n")
            continue

        if bedrooms and not _matches_bedrooms(r, bedrooms):
            sys.stderr.write(f"  [skip-bedrooms] {title[:70]}\n")
            continue

        if estados and not _matches_estado_obra(r, estados):
            sys.stderr.write(f"  [skip-estado] {title[:60]}\n")
            continue

        if not _matches_metraje(r, m2c_min, m2c_max, m2t_min, m2t_max):
            sys.stderr.write(f"  [skip-m2] {title[:60]}\n")
            continue

        # Barrio filter: only drop when a specific neighbourhood is visible in
        # the location string but none of the selected ones match.  Generic
        # city-level locations (no comma) are passed through to avoid hiding
        # results we simply can't confirm.
        if barrios:
            loc_norm = _strip_accents(location.lower())
            has_selected = any(
                any(v in loc_norm for v in _barrio_variants(b))
                for b in barrios
            )
            if not has_selected and "," in location:
                sys.stderr.write(f"  [skip-barrio] {location[:60]}\n")
                continue

        if min_price is not None or max_price is not None:
            if not price_in_range(price, min_price, max_price, currency):
                sys.stderr.write(f"  [skip-price] {price!r}\n")
                continue

        kept.append(r)

    if prop_types and tipo_in > 0:
        sys.stderr.write(
            f"  [filters] tipo filter: {tipo_in} in →"
            f" {tipo_in - tipo_dropped} kept | {tipo_dropped} dropped\n"
        )
    if city_filter_on and city_in > 0:
        sys.stderr.write(
            f"  [filters] city filter: {city_in} in →"
            f" {city_in - city_dropped} kept | {city_dropped} dropped\n"
        )

    return kept
