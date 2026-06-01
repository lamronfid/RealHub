"""
Propsearch scraper — async parallel multi-site scraper for Paraguay real estate.

Architecture:
- All sites scraped in parallel (asyncio.gather)
- All pages per site scraped in parallel (up to max_pages, default 5)
- Images/fonts/media blocked to cut load time
- Smart waits: wait_for_selector instead of fixed sleeps

Sites: infocasas, brokers, century21, view, remax
"""

import asyncio
import http.client
import json
import re
import ssl
import sys
import unicodedata
import urllib.parse

from playwright.async_api import async_playwright
from playwright_stealth import Stealth

_MERSAN_STEALTH = Stealth(
    navigator_languages_override=('es-PY', 'es', 'en-US', 'en'),
    navigator_platform_override='MacIntel',
)

_REMAX_SSL_CTX = ssl.create_default_context()
_REMAX_SSL_CTX.check_hostname = False
_REMAX_SSL_CTX.verify_mode = ssl.CERT_NONE

# ── Helpers ───────────────────────────────────────────────────────────────────

RENT_SIGNALS = ("alquil", "arrend", "arriendo", " renta", "mensual")
SALE_SIGNALS = ("en venta", "se vende", "vendo ", "a la venta")

TYPE_MAP = {
    "casa":              "casas",
    "departamento":      "departamentos",
    "dúplex":            "duplex",
    "duplex":            "duplex",
    "terreno":           "terrenos",
    "terreno/lote":      "terrenos",
    "estancia/campo":    "terrenos",
    "quinta/country":    "casas",
    "local comercial":   "locales-comerciales",
    "local_comercial":   "locales-comerciales",
    "oficina":           "locales-comerciales",
    "depósito/tinglado": "locales-comerciales",
    "industria":         "locales-comerciales",
    "alojamiento":       "locales-comerciales",
    "edificio":          "casas",
    # fallback for empty tipo → all-properties slug on infocasas
    "":                  "propiedades",
}

# century21 real URL segment maps (discovered via JS source inspection).
# The /busqueda?operacion=&tipo=&ciudad= params are 100% cosmetic — the server
# ignores them. The working URL is segment-based:
#   /busqueda{tipo_url}{op_url}/en-estado_{city}[/en-municipio_{barrio}-{city}]
C21_TYPE_URL = {
    "casa":              "/tipo_casa-o-casa-duplex-o-casa-en-condominio",
    "departamento":      "/tipo_departamento-o-departamento-en-pozo-o-penthouse",
    "dúplex":            "/tipo_departamento-o-departamento-en-pozo-o-penthouse",
    "duplex":            "/tipo_departamento-o-departamento-en-pozo-o-penthouse",
    "terreno":           "/tipo_quinta-o-rancho-o-terreno-o-hacienda-o-huerta",
    "terreno/lote":      "/tipo_quinta-o-rancho-o-terreno-o-hacienda-o-huerta",
    "estancia/campo":    "/tipo_quinta-o-rancho-o-terreno-o-hacienda-o-huerta",
    "quinta/country":    "/tipo_casa-o-casa-duplex-o-casa-en-condominio",
    "local comercial":   "/tipo_local",
    "local_comercial":   "/tipo_local",
    "oficina":           "/tipo_local",
    "depósito/tinglado": "/tipo_local",
    "industria":         "/tipo_local",
    "alojamiento":       "/tipo_local",
    "edificio":          "/tipo_departamento-o-departamento-en-pozo-o-penthouse",
}
C21_OP_URL = {"alquiler": "/operacion_renta", "venta": "/operacion_venta"}

# Maps slugified city name → (estadoWebFinal, municipioWebFinal) for C21 URL building.
# Asunción is special: it IS a state in C21's DB — use en-estado_asuncion with no municipio.
# All other cities: /en-estado_{estado}/en-municipio_{municipio}
C21_CITY_MAP: dict[str, tuple[str, str | None]] = {
    "asuncion":               ("asuncion",      None),
    "asunción":               ("asuncion",      None),
    "luque":                  ("central",        "luque-central"),
    "san-lorenzo":            ("central",        "san-lorenzo-central"),
    "lambare":                ("central",        "lambare-central"),
    "lambaré":                ("central",        "lambare-central"),
    "fernando-de-la-mora":    ("central",        "fernando-de-la-mora-central"),
    "mariano-roque-alonso":   ("central",        "mariano-roque-alonso-central"),
    "villa-elisa":            ("central",        "villa-elisa-central"),
    "aregua":                 ("central",        "aregua-central"),
    "areguá":                 ("central",        "aregua-central"),
    "nemby":                  ("central",        "nemby-central"),
    "ñemby":                  ("central",        "nemby-central"),
    "itaugua":                ("central",        "itaugua-central"),
    "itauguá":                ("central",        "itaugua-central"),
    "capiata":                ("central",        "capiata-central"),
    "capiatá":                ("central",        "capiata-central"),
    "ypacarai":               ("central",        "ypacarai-central"),
    "ypacaraí":               ("central",        "ypacarai-central"),
    "limpio":                 ("central",        "limpio-central"),
    "villeta":                ("central",        "villeta-central"),
    "ypane":                  ("central",        "ypane-central"),
    "ypané":                  ("central",        "ypane-central"),
    "san-bernardino":         ("cordillera",     "san-bernardino-cordillera"),
    "caacupe":                ("cordillera",     "caacupe-cordillera"),
    "caacupé":                ("cordillera",     "caacupe-cordillera"),
    "ciudad-del-este":        ("alto-parana",    "ciudad-del-este-alto-parana"),
    "hernandarias":           ("alto-parana",    "hernandarias-alto-parana"),
    "minga-guazu":            ("alto-parana",    "minga-guazu-alto-parana"),
    "encarnacion":            ("itapua",         "encarnacion-itapua"),
    "encarnación":            ("itapua",         "encarnacion-itapua"),
    "pedro-juan-caballero":   ("amambay",        "pedro-juan-caballero-amambay"),
    "concepcion":             ("concepcion",     "concepcion-concepcion"),
    "concepción":             ("concepcion",     "concepcion-concepcion"),
    "filadelfia":             ("boqueron",       "boqueron-filadelfia"),
    "coronel-oviedo":         ("caaguazu",       "coronel-oviedo-caaguazu"),
    "pilar":                  ("neembucu",       "pilar-neembucu"),
}

# century21: extract "city-dept" from property URL slugs like
# "87_departamento-en-renta-en-luque-central-paraguay"
C21_LOC_RE = re.compile(r'en-(?:venta|renta|alquiler)-en-([a-z0-9-]+?)(?:-paraguay)?$')

# view.com.py API category IDs — verified against API CategoryName field:
#   1=Departamento  2=Casa  3=Galpón  4=Local  7=Oficina
#   8=Lote  9=Edificio  11=Campo  (5,6,10 = no active listings)
# "quinta/country" omitted: view has no Quinta category (ID 10 = 0 results).
VIEW_TIPO_MAP = {
    "departamento":      1,
    "casa":              2,
    "terreno":           8,
    "terreno/lote":      8,
    "estancia/campo":    11,
    "local comercial":   4,
    "local_comercial":   4,
    "oficina":           7,
    "depósito/tinglado": 3,
    "industria":         3,
    "alojamiento":       4,
    "edificio":          9,   # ID 9 = Edificio (was wrongly 1/Departamento)
    "dúplex":            1,
    "duplex":            1,
}

# Reverse map: normalised CategoryName from the API → our canonical tipo.
# Used by _scrape_view to populate listing['tipo'] as Tier 1 ground truth.
_VIEW_CATEGORY_TO_TIPO: dict[str, str] = {
    "departamento":   "departamento",
    "casa":           "casa",
    "galpon":         "depósito/tinglado",   # "Galpón" normalised
    "local":          "local comercial",
    "oficina":        "oficina",
    "lote":           "terreno",
    "edificio":       "edificio",
    "campo":          "estancia/campo",
}

# view.com.py operation filter: must be numeric, not a string slug.
# "2"=Venta, "1"=Alquiler, "3"=Alquiler Temporario
_VIEW_OP_MAP = {"venta": "2", "compra": "2", "alquiler": "1"}

_VIEW_SSL_CTX = ssl.create_default_context()
_VIEW_SSL_CTX.check_hostname = False
_VIEW_SSL_CTX.verify_mode = ssl.CERT_NONE

# Full list of area names exposed by view.com.py (from AreasList in their HTML).
# Used for fuzzy barrio→areaId matching.
_VIEW_AREAS = [
    "Acceso Sur","Acqua Village","Agua Vista","Alto Paraguay","Anfiteatro","Area 3","AREGUA",
    "Atyrá","Barrio Bella Vista","Barrio Bernardino Caballero","Barrio Carmelitas",
    "Barrio Catedral","Barrio Ciudad Nueva","Barrio el Dorado","Barrio El Mangal",
    "Barrio Gral. Diaz","Barrio Herrera","Barrio Jara","Barrio Las Lomas",
    "Barrio Las Mercedes","Barrio Laurelty","Barrio Los Laureles","Barrio Manorá",
    "Barrio Mariscal Estigarribia","Barrio Mariscal López","barrio Mburicao",
    "Barrio Mburucuya","Barrio Obrero","Barrio Pettirossi","Barrio Pinar",
    "Barrio Recoleta","Barrio Sajonia","Barrio Salvador del Mundo","Barrio San Cristobal",
    "Barrio San Jorge","Barrio San Jose","Barrio San Luis","Barrio Seminario",
    "Barrio Trinidad","Barrio Villa Aurelia","Barrio Villa Morra","Barrio Vista Alegre",
    "Barrio Ycuá Satí","Bella Vista","Bernardino Caballero","Bosque","Caacupe",
    "Cañada del Ybyray","Cañada San Miguel","Capiata","Carapegua","Centro","Chaco´i",
    "Chubut","Ciervo Cua","Club de Pesca de Yacyreta","Corazon de Jesus",
    "Coronel Bogado","Coronel Oviedo","Estanzuela","Falcon","Fernando de la Mora",
    "Ita Enramada","Itá Enramada","Itaugua","Jardin de Oro","La encarnacion","Lambaré",
    "Las Lomas","Las Lomas (Carmelitas)","Las Mercedes","Limpio","Loma Merlo",
    "Los Laureles","Luque","Luque-San ber","Madame Linch","Manorá","Maria Emilia 2",
    "Mariano Roque Alonso","Mariscal Lopez","Mariscal López","Mbocayaty","Mburicaó",
    "Mburucuyá","Mora Cue","Nazareth","Nueva Asunción","Palma Loma","Piribebuy",
    "Potrero","Recoleta","Ruta Principal","San Bernardino","San Blas","San Isidro",
    "San Jorge","San Lorenzo","San Rafael","San Roque","San Vicente","Santa Librada",
    "Santa Maria","Santa Rosa","Santa Teresa","Santisima Trinidad","Santo Domingo",
    "Seminario","Sto. Domingo","Sunset Hills","Terrazas del sol","Trinidad",
    "Tte. Esteban Martínez","Urbanizacion Cantegril","Urbanización Surubi'i",
    "Villa Aurelia","Villa Delfina","Villa Hayes","Villa Morra","Villa Ofelia",
    "Villa Policial","VIRGEN DE  ASUNCION","Virgen de Fatima","Virgen del Huerto",
    "Yacht","Yaguareté Corá","Ycuá Satí","Ypane","Yrupe","Zarate Isla","Zeballos Cue",
    "Zona aeropuerto","Zona CIT","Zona CIT (Club Internacional de Tenis)",
    "Zona Conmebol","ZONA ESVEDRA","Zona Florida","Zona Laguna Grande",
    "Zona Los Jardines","Zona Mirador San Jose Obrero","Zona Municipalidad (sede nueva)",
    "Zona Norte","Zona Rakiura","Zona Ruta PY01","Zona Ruta PY18","Zona Shopping Pinedo",
    "Zona Sur","Zona Surubi´i","Zona UNA",
]

def _norm_area(s: str) -> str:
    """Normalize an area name for fuzzy matching: lowercase, strip accents and prefixes."""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.removeprefix("barrio ").removeprefix("zona ").strip()

_VIEW_AREA_INDEX: dict[str, list[str]] = {}
for _a in _VIEW_AREAS:
    _k = _norm_area(_a)
    _VIEW_AREA_INDEX.setdefault(_k, []).append(_a)

# Barrio name → view.com.py spelling corrections (view has typos in its area list)
_VIEW_BARRIO_ALIASES: dict[str, str] = {
    "madame lynch": "madame linch",  # view lists this barrio as "Madame Linch"
}

def _find_view_areas(barrio: str) -> list[str]:
    """Return all view.com.py area names that match a barrio string.

    Collects every area whose normalised name equals or contains the barrio
    norm (and vice-versa), preserving all "Barrio X" / "X" variants so both
    are scraped when the user selects a neighbourhood.
    """
    norm = _norm_area(barrio)
    if not norm:
        return []
    # Apply view-specific spelling aliases before looking up the index
    norm = _VIEW_BARRIO_ALIASES.get(norm, norm)
    matched: list[str] = []
    seen: set[str] = set()
    for key, areas in _VIEW_AREA_INDEX.items():
        if norm == key or norm in key or key in norm:
            for area in areas:
                if area not in seen:
                    matched.append(area)
                    seen.add(area)
    return matched


def _view_api_get(params: dict) -> dict:
    """Synchronous GET to view.com.py TraerPropiedades API."""
    qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
    conn = http.client.HTTPSConnection("www.view.com.py", timeout=15, context=_VIEW_SSL_CTX)
    conn.request("GET", f"/Inicio/TraerPropiedades?{qs}", headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.view.com.py/Inicio/Propiedades",
    })
    resp = conn.getresponse()
    data = resp.read()
    conn.close()
    return json.loads(data)

PROVINCE_MAP = {
    # Asunción is its own province in Remax (not part of Central)
    "asuncion":                "22132",
    "asunción":                "22132",
    # Central department (22137) — all cities share the same ID
    "san-lorenzo":             "22137",
    "luque":                   "22137",
    "lambare":                 "22137",
    "lambaré":                 "22137",
    "fernando-de-la-mora":     "22137",
    "mariano-roque-alonso":    "22137",
    "villa-elisa":             "22137",
    "capiata":                 "22137",
    "capiatá":                 "22137",
    "aregua":                  "22137",
    "areguá":                  "22137",
    "nemby":                   "22137",
    "ñemby":                   "22137",
    "itaugua":                 "22137",
    "itauguá":                 "22137",
    "ypacarai":                "22137",
    "ypacaraí":                "22137",
    "limpio":                  "22137",
    "villeta":                 "22137",
    "ypane":                   "22137",
    "ypané":                   "22137",
    # Cordillera (22139)
    "san-bernardino":          "22139",
    "caacupe":                 "22139",
    "caacupé":                 "22139",
    # Alto Paraná (22130)
    "ciudad-del-este":         "22130",
    "hernandarias":            "22130",
    "minga-guazu":             "22130",
    # Itapúa (22141)
    "encarnacion":             "22141",
    "encarnación":             "22141",
    # Amambay (22131)
    "pedro-juan-caballero":    "22131",
    # Concepción (22138)
    "concepcion":              "22138",
    "concepción":              "22138",
    # Boquerón (22133)
    "filadelfia":              "22133",
    # Caaguazú (22134)
    "coronel-oviedo":          "22134",
    # Ñeembucú (22143)
    "pilar":                   "22143",
    # Guairá (22140)
    "villarrica":              "22140",
}

# Remax: MacroPropertyTypeUID values from /locales_v2/es-PY/macropropertytype.json
REMAX_TIPO_MAP = {
    "casa":              "17612",
    "departamento":      "17610",
    "dúplex":            "17613",
    "duplex":            "17613",
    "terreno":           "17618",
    "terreno/lote":      "17618",
    "estancia/campo":    "17618",
    "quinta/country":    "17612",
    "local comercial":   "17608",
    "local_comercial":   "17608",
    "oficina":           "17608",
    "depósito/tinglado": "17608",
    "industria":         "17608",
    "alojamiento":       "17608",
    "edificio":          "17610",
}
# TransactionTypeUID: 261 = venta, 260 = alquiler
REMAX_TXN_MAP = {"venta": "261", "alquiler": "260"}

# brokers.com.py filter slugs (from their search form options)
BROKERS_TIPO_MAP = {
    "casa":              "casa",
    "departamento":      "departamento",
    "dúplex":            "duplex",
    "duplex":            "duplex",
    "terreno":           "terreno",
    "terreno/lote":      "terreno",
    "estancia/campo":    "terreno",
    "quinta/country":    "casa",
    "local comercial":   "local-comercial",
    "local_comercial":   "local-comercial",
    "oficina":           "local-comercial",
    "depósito/tinglado": "local-comercial",
    "industria":         "local-comercial",
    "alojamiento":       "local-comercial",
    "edificio":          "departamento",
}
BROKERS_STATUS_MAP = {"venta": "en-venta", "alquiler": "en-alquiler"}

# asuncion.estate URL slugs
AE_TIPO_MAP = {
    "casa":             "casas",
    "departamento":     "apartamentos",
    "dúplex":           "apartamentos",
    "duplex":           "apartamentos",
    "terreno":          "terreno",
    "terreno/lote":     "terreno",
    "estancia/campo":   "terreno",
    "local comercial":  "locales-comerciales",
    "local_comercial":  "locales-comerciales",
    "oficina":          "locales-comerciales",
}
AE_OP_MAP = {"venta": "venta", "alquiler": "alquiler"}
# City slug for asuncion.estate (expands as needed)
AE_CITY_MAP: dict[str, str] = {
    "asuncion": "asuncion",
    "asunción": "asuncion",
    "luque":    "luque",
    "lambare":  "lambare",
    "lambaré":  "lambare",
}

# Maps slugified city/location name → brokers department slug
BROKERS_STATE_MAP = {
    "asuncion":                "asuncion",
    "asunción":                "asuncion",
    "luque":                   "central",
    "san-lorenzo":             "central",
    "lambare":                 "central",
    "lambaré":                 "central",
    "fernando-de-la-mora":     "central",
    "capiatá":                 "central",
    "capiata":                 "central",
    "villa-elisa":             "central",
    "mariano-roque-alonso":    "central",
    "aregua":                  "central",
    "areguá":                  "central",
    "nemby":                   "central",
    "ñemby":                   "central",
    "itaugua":                 "central",
    "itauguá":                 "central",
    "ypacarai":                "central",
    "ypacaraí":                "central",
    "san-bernardino":          "cordillera",
    "caacupe":                 "cordillera",
    "caacupé":                 "cordillera",
    "ciudad-del-este":         "alto-parana",
    "hernandarias":            "alto-parana",
    "minga-guazu":             "alto-parana",
    "encarnacion":             "itapua",
    "encarnación":             "itapua",
    "pedro-juan-caballero":    "amambay",
    "concepcion":              "concepcion",
    "concepción":              "concepcion",
    "filadelfia":              "boqueron",
    "pilar":                   "neembucu",
    "coronel-oviedo":          "caaguazu",
    "villarrica":              "guaira",
}

# Keywords used to locate the property-type token inside Remax card inner_text
_REMAX_TIPO_TOKENS = (
    "casa", "departamento", "depto", "apartamento", "terreno", "lote",
    "local", "oficina", "galpon", "galpón", "duplex", "dúplex", "chalet", "quinta",
)

# Photo CDN: RegionId 114 = Paraguay
_REMAX_PHOTO_CDN = "https://cdn.gryphtech.com/userimages/114/LargeWM/{}"


def _remax_format_price(price: float, currency: str, txn_id: str) -> str:
    """Convert Remax API price fields to a string runner.py can parse."""
    if currency == "USD":
        return f"USD {price:,.0f}"
    # Some agents enter USD amounts but select PYG — heuristic: sale price < 1M → USD
    if currency == "PYG" and txn_id == "261" and price < 1_000_000:
        return f"USD {price:,.0f}"
    return f"₲ {int(price):,}"


def _remax_api_post(body: dict) -> dict:
    """Synchronous POST to the Remax Azure Search proxy (called via asyncio.to_thread)."""
    conn = http.client.HTTPSConnection("www.remax.com.py", timeout=15, context=_REMAX_SSL_CTX)
    conn.request(
        "POST",
        "/search/listing-search/docs/search",
        body=json.dumps(body),
        headers={
            "Content-Type": "application/json",
            "Origin":        "https://www.remax.com.py",
            "Referer":       "https://www.remax.com.py/",
            "User-Agent":    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
    )
    resp = conn.getresponse()
    data = json.loads(resp.read())
    conn.close()
    return data


# Block heavy resources — images still have src= attributes we can read
BLOCKED_RESOURCES = re.compile(
    r"\.(png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|otf|mp4|webm|svg)(\?.*)?$",
    re.IGNORECASE,
)


def _parse_py_number(s: str) -> float | None:
    """
    Parse a numeric string that may use Paraguayan dot-as-thousands formatting.
    "1.147" → 1147 (dot is thousands separator, 3 trailing digits)
    "80.00" → 80.0 (dot is decimal point, 2 trailing digits)
    "1.147,00" → 1147.0
    Returns None for empty, zero, or unparseable input.
    """
    s = re.sub(r'[^\d.,]', '', s.strip())
    if not s:
        return None
    parts = s.split('.')
    # "1.147" pattern: one dot, exactly 3 digits after → thousands separator
    if len(parts) == 2 and len(parts[1]) == 3 and ',' not in s:
        s = parts[0] + parts[1]
    s = s.replace(',', '.')
    try:
        v = float(s)
        return v if v > 0 else None
    except ValueError:
        return None


def slugify(text: str) -> str:
    if not text:
        return "asuncion"
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return (
        text.lower()
        .strip()
        .replace(" ", "-")
        .replace(",", "")
        .replace("(", "")
        .replace(")", "")
    )


def op_matches_keywords(title: str, price: str, op: str) -> bool:
    text = f"{title} {price}".lower()
    if op == "alquiler":
        has_sale = any(k in text for k in SALE_SIGNALS)
        has_rent = any(k in text for k in RENT_SIGNALS)
        if has_sale and not has_rent:
            return False
    elif op == "venta":
        has_rent = any(k in text for k in RENT_SIGNALS)
        has_sale = any(k in text for k in SALE_SIGNALS)
        if has_rent and not has_sale:
            return False
    return True


def resolve_href(href: str | None, page_url: str, base: str) -> str:
    if not href:
        return ""
    if href.startswith("http"):
        return href
    if href.startswith("//"):
        return "https:" + href
    if href.startswith("/"):
        return base.rstrip("/") + href
    return base.rstrip("/") + "/" + href


async def _text(el, selector: str) -> str:
    try:
        sub = await el.query_selector(selector)
        if sub:
            return (await sub.inner_text()).strip()
    except Exception:
        pass
    return ""


async def _attr(el, selector: str, attr: str) -> str:
    try:
        sub = await el.query_selector(selector)
        if sub:
            return (await sub.get_attribute(attr) or "").strip()
    except Exception:
        pass
    return ""


async def _block(route):
    if BLOCKED_RESOURCES.search(route.request.url):
        await route.abort()
    else:
        await route.continue_()


# ── Per-site scrape functions ─────────────────────────────────────────────────
# Each takes (context, op, tipo, location, page_num) → list[dict]
# page_num: 1-based.  Returns [] on failure.

async def _scrape_infocasas(ctx, op: str, tipo: str, location: str, page_num: int, barrios: list | None = None, bedrooms: list | None = None):
    base = "https://www.infocasas.com.py"
    op_slug = "alquiler" if op == "alquiler" else "venta"
    bedrooms = bedrooms or []
    # Monoambiente is its own URL category on infocasas — override tipo_slug
    # only when the user exclusively wants monoambientes (no other bedroom counts).
    if bedrooms == ["0"]:
        tipo_slug = "monoambiente"
    else:
        tipo_slug = TYPE_MAP.get(tipo.lower(), "propiedades")
    city_slug = slugify(location)

    # Some barrios are stored under an abbreviated slug on infocasas.
    _IC_SLUG_OVERRIDES: dict[str, str] = {
        "madame lynch": "mme-lynch",
        "mme. lynch":   "mme-lynch",
        "mme lynch":    "mme-lynch",
    }

    # Build barrio path for server-side neighbourhood filtering
    if barrios:
        barrio_slugs = [_IC_SLUG_OVERRIDES.get(b.lower(), slugify(b)) for b in barrios]
        loc_path = city_slug + "/" + "-y-en-".join(barrio_slugs)
    else:
        loc_path = city_slug

    url = f"{base}/{op_slug}/{tipo_slug}/{loc_path}"
    if page_num > 1:
        url += f"/pagina{page_num}"

    page = await ctx.new_page()
    results = []
    try:
        await page.goto(url, timeout=20_000, wait_until="domcontentloaded")
        try:
            await page.wait_for_selector(".listingCard", timeout=8_000)
        except Exception:
            return []

        # Extract structured data from __NEXT_DATA__ — more reliable than HTML parsing
        html = await page.content()
        nd_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
        if nd_match:
            nd = json.loads(nd_match.group(1))
            sf = (
                nd.get("props", {})
                  .get("pageProps", {})
                  .get("fetchResult", {})
                  .get("searchFast", {})
            )
            items = sf.get("data", [])
            # Expose total pages to _scrape_site for full coverage
            pg_info = sf.get("paginatorInfo", {})
            if pg_info.get("lastPage"):
                ctx.infocasas_last_page = pg_info["lastPage"]
                # Also store per-barrio so parallel multi-barrio scrapes don't collide
                if barrios and len(barrios) == 1:
                    setattr(ctx, f"ic_lp_{slugify(barrios[0])}", pg_info["lastPage"])
                sys.stderr.write(f"  [infocasas p{page_num}] {len(items)} listings | total pages: {pg_info['lastPage']}\n")
            else:
                sys.stderr.write(f"  [infocasas p{page_num}] {len(items)} listings (structured)\n")
            for item in items:
                price_data  = item.get("price") or {}
                amount      = price_data.get("amount") or 0
                cur_id      = (price_data.get("currency") or {}).get("id", 1)
                if cur_id == 3:        # Guaraní
                    price_str = f"Gs. {int(amount):,.0f}".replace(",", ".") if amount else "Consultar"
                else:                   # USD
                    price_str = f"U$S {int(amount):,}" if amount else "Consultar"

                link  = item.get("link", "")
                title = item.get("title", "Sin título")

                # Build "{Neighbourhood}, {City}" location string — the barrio
                # filter in runner.py needs the neighbourhood name, not the street.
                locs          = item.get("locations") or {}
                neighbourhoods = locs.get("neighbourhood") or []
                nb_name       = (neighbourhoods[0].get("name") or "") if neighbourhoods else ""
                states        = locs.get("state") or []
                city_name     = (states[0].get("name") or "") if states else ""
                if nb_name and city_name:
                    loc_str = f"{nb_name}, {city_name}"
                elif nb_name:
                    loc_str = nb_name
                else:
                    loc_str = item.get("address") or location

                # m²: prefer built area, fall back to total area
                m2_built = item.get("m2Built") or None
                metros = m2_built if m2_built else (item.get("m2") or None)

                results.append({
                    "source":    "infocasas.com.py",
                    "title":     title,
                    "price":     price_str,
                    "location":  loc_str,
                    "url":       base + link if link else "",
                    "photo":     item.get("img") or None,
                    "bedrooms":  item.get("bedrooms"),
                    "metros":    metros,
                    "listed_at": item.get("created_at"),  # YYYY-MM-DD; used for freshness filter
                    "ciudad":    location,
                })
        else:
            # Fallback to HTML scraping
            cards = await page.query_selector_all(".listingCard")
            sys.stderr.write(f"  [infocasas p{page_num}] {len(cards)} cards (HTML fallback)\n")
            for card in cards:
                title    = await _text(card, "h2")
                price    = await _text(card, ".property-price-tag")
                location_ = await _text(card, "[class*='location']")
                href     = await _attr(card, "a[href]", "href")
                photo    = await _attr(card, "img", "src")
                if not op_matches_keywords(title, price, op):
                    continue
                # Fallback text parsing: "3 Dorms." → 3, standalone m² number
                card_text = await card.inner_text()
                beds_m = re.search(r'(\d+)\s*(?:dorm|mono)', card_text, re.IGNORECASE)
                area_m = re.search(r'(\d[\d.]*)\s*m[²2]', card_text, re.IGNORECASE)
                bedrooms_val = (0 if re.search(r'mono', card_text, re.IGNORECASE)
                                else (int(beds_m.group(1)) if beds_m else None))
                metros_val   = _parse_py_number(area_m.group(1)) if area_m else None
                results.append({
                    "source":   "infocasas.com.py",
                    "title":    title or "Sin título",
                    "price":    price or "Consultar",
                    "location": location_ or location,
                    "url":      resolve_href(href, url, base),
                    "photo":    photo or None,
                    "bedrooms": bedrooms_val,
                    "metros":   metros_val,
                    "ciudad":   location,
                })
    except Exception as e:
        sys.stderr.write(f"  [infocasas p{page_num}] error: {e}\n")
    finally:
        await page.close()
    return results


async def _scrape_brokers(ctx, op: str, tipo: str, location: str, page_num: int, bedrooms: list | None = None):
    base       = "https://www.brokers.com.py"
    loc_slug   = slugify(location)
    state_slug = BROKERS_STATE_MAP.get(loc_slug, loc_slug)
    tipo_slug  = BROKERS_TIPO_MAP.get(tipo.lower(), "")
    status     = BROKERS_STATUS_MAP.get(op, "en-venta")
    bedrooms   = bedrooms or []

    qs = f"status[]={status}"
    if tipo_slug:
        qs += f"&type[]={tipo_slug}"
    qs += f"&states[]={state_slug}"
    # Single non-mono bedroom selected: push the count to the URL for server-side pre-filter.
    # Multiple values → skip; per-page apply_filters handles the OR logic.
    non_mono = [b for b in bedrooms if b != "0"]
    if len(non_mono) == 1:
        qs += f"&bedrooms={int(non_mono[0].rstrip('+'))}"

    if page_num == 1:
        url = f"{base}/propiedades/?{qs}"
    else:
        url = f"{base}/propiedades/page/{page_num}/?{qs}"

    page = await ctx.new_page()
    results = []
    try:
        await page.goto(url, timeout=20_000, wait_until="domcontentloaded")
        try:
            await page.wait_for_selector(".card", timeout=8_000)
        except Exception:
            return []

        cards = await page.query_selector_all(".card")
        sys.stderr.write(f"  [brokers p{page_num}] {len(cards)} cards | {tipo_slug}/{status}/{state_slug}\n")
        for card in cards:
            title     = await _text(card, "h2, .item-title")
            price     = await _text(card, ".item-price")
            location_ = await _text(card, ".item-address")

            link_el = await card.query_selector("h2 a, .item-title a, a[href*='/propiedad/']")
            href    = (await link_el.get_attribute("href") or "") if link_el else ""
            photo   = await _attr(card, "img", "src")

            # Bedrooms: "Habitaciones: 2" or "Habitación: 1" → li.h-beds .hz-figure
            beds_raw = await _text(card, "li.h-beds .hz-figure")
            try:
                bedrooms = int(beds_raw) if beds_raw else None
            except (ValueError, TypeError):
                bedrooms = None

            # Area m²: "80.00" → li.h-area .hz-figure
            area_raw = await _text(card, "li.h-area .hz-figure")
            metros   = _parse_py_number(area_raw) if area_raw else None

            results.append({
                "source":   "brokers.com.py",
                "title":    title or "Sin título",
                "price":    price or "Consultar",
                "location": location_ or location,
                "url":      resolve_href(href, url, base),
                "photo":    photo or None,
                "bedrooms": bedrooms,
                "metros":   metros,
                "ciudad":   None,  # broker filters by dept not city; let Tier 2/3 resolve
            })
    except Exception as e:
        sys.stderr.write(f"  [brokers p{page_num}] error: {e}\n")
    finally:
        await page.close()
    return results


async def _scrape_century21(ctx, op: str, tipo: str, location: str, page_num: int, barrios: list | None = None, bedrooms: list | None = None):
    base      = "https://century21.com.py"
    tipo_url  = C21_TYPE_URL.get(tipo.lower(), "")
    op_url    = C21_OP_URL.get(op, "/operacion_venta")
    city_slug = slugify(location)

    # Server-side bedroom filter: /recamaras_{n}/uso_habitacional
    # Only when a single non-mono value is given — multiple values handled by apply_filters.
    non_mono = [b for b in (bedrooms or []) if b != "0"]
    if len(non_mono) == 1:
        bed_n = int(non_mono[0].rstrip("+"))
        bed_segment = f"/recamaras_{bed_n}/uso_habitacional"
    else:
        bed_segment = ""

    # Resolve C21's estado/municipio URL slugs from our map
    c21_loc = C21_CITY_MAP.get(city_slug, C21_CITY_MAP.get(location.lower()))
    if c21_loc:
        estado, municipio = c21_loc
    else:
        # Unknown city — use the slug as-is (may 404; C21 will skip gracefully)
        estado, municipio = city_slug, None

    def _make_loc_url(barrio_name: str | None) -> str:
        if barrio_name:
            barrio_slug = slugify(barrio_name)
            return f"/en-estado_{estado}/en-municipio_{barrio_slug}-{estado}"
        if municipio:
            return f"/en-estado_{estado}/en-municipio_{municipio}"
        return f"/en-estado_{estado}"

    # century21's -o- combined URL 404s when any slug is unknown in their DB.
    # Safest: one URL per barrio, run in parallel, skip 404s.
    loc_urls = (
        [(b, _make_loc_url(b)) for b in barrios]
        if barrios
        else [(None, _make_loc_url(None))]
    )

    async def _scrape_one_c21(barrio_name, loc_url):
        url = f"{base}/busqueda{tipo_url}{op_url}{bed_segment}{loc_url}"
        if page_num > 1:
            url = url.rstrip("/") + f"/pagina_{page_num}/"
        pg  = await ctx.new_page()
        items = []
        try:
            resp = await pg.goto(url, timeout=20_000, wait_until="domcontentloaded")
            if resp and resp.status == 404:
                sys.stderr.write(f"  [century21] 404 (unknown barrio slug): {loc_url[-50:]}\n")
                return []
            try:
                await pg.wait_for_selector(".card", timeout=8_000)
            except Exception:
                return []

            cards = await pg.query_selector_all(".card")
            sys.stderr.write(f"  [century21] {len(cards)} cards | ...{url[-55:]}\n")

            for card in cards:
                title_text = await _text(card, ".card-title")
                price = await _text(card, ".card-footer .card-title")
                if not price:
                    price = "Consultar"

                link_el = await card.query_selector("a[href*='/propiedad/']")
                href    = (await link_el.get_attribute("href") or "") if link_el else ""
                photo   = await _attr(card, "img", "src")

                # When barrio is known from URL, use it directly; else parse slug
                if barrio_name:
                    loc_str = f"{barrio_name}, {location.title()}"
                else:
                    loc_str = location.title()
                    if href:
                        slug_part = href.split("/")[-1]
                        lm = C21_LOC_RE.search(slug_part)
                        if lm:
                            parts = lm.group(1).split("-")
                            loc_str = (parts[0].title() if len(parts) == 1
                                       else " ".join(p.title() for p in parts[:-1]) + ", " + parts[-1].title())

                # Bedrooms / m² — parse from card text since C21 has no consistent
                # structured selector; gracefully returns None if not found.
                card_text = await card.inner_text()
                beds_m = re.search(r'(\d+)\s*(?:dorm|hab|cuarto|recamara)', card_text, re.IGNORECASE)
                area_m = re.search(r'([\d.,]+)\s*m[²2]', card_text, re.IGNORECASE)
                c21_bedrooms = int(beds_m.group(1)) if beds_m else None
                c21_metros   = _parse_py_number(area_m.group(1)) if area_m else None

                items.append({
                    "source":   "century21.com.py",
                    "title":    title_text or "Sin título",
                    "price":    price,
                    "location": loc_str,
                    "url":      resolve_href(href, url, base),
                    "photo":    photo or None,
                    "bedrooms": c21_bedrooms,
                    "metros":   c21_metros,
                    "ciudad":   location,
                })
        except Exception as e:
            sys.stderr.write(f"  [century21] error {loc_url[-40:]}: {e}\n")
        finally:
            await pg.close()
        return items

    per_barrio = await asyncio.gather(*[_scrape_one_c21(b, u) for b, u in loc_urls])
    seen: set[str] = set()
    results: list[dict] = []
    for batch in per_barrio:
        for item in batch:
            key = item.get("url", "")
            if key and key in seen:
                continue
            if key:
                seen.add(key)
            results.append(item)
    return results


# Province IDs that cover multiple cities (from the PROVINCE_MAP comments).
# For these, the Remax province filter is too broad to trust as a city filter —
# ciudad must be None so Tier-2/3 text scanning resolves the actual city.
# All other IDs map to a single city and can use ciudad=location.
_REMAX_SHARED_PROVINCE_IDS: frozenset[str] = frozenset({
    "22137",   # Central — luque, san-lorenzo, lambaré, fernando de la mora, etc.
    "22139",   # Cordillera — san-bernardino, caacupé
    "22130",   # Alto Paraná — ciudad del este, hernandarias, minga guazú
})


async def _scrape_remax(ctx, op: str, tipo: str, location: str, page_num: int, bedrooms: list | None = None, barrios: list | None = None):
    """Scrape Remax via their Azure Search API — no browser, true pagination."""
    loc_slug    = slugify(location)
    province_id = PROVINCE_MAP.get(loc_slug, "22132")
    tipo_id     = REMAX_TIPO_MAP.get(tipo.lower(), "")
    txn_id      = REMAX_TXN_MAP.get(op, "261")

    filt = (
        f"content/TenantId eq 6 and content/MacroRegionId eq 114 "
        f"and content/OnHoldListing eq false and content/IsRegionalOffice eq false "
        f"and content/IsViewable eq true and content/ProvinceID eq {province_id} "
        f"and content/TransactionTypeUID eq {txn_id}"
    )
    if tipo_id:
        filt += f" and content/MacroPropertyTypeUID eq {tipo_id}"
    bedrooms = bedrooms or []
    if bedrooms:
        clauses = []
        for b in bedrooms:
            if b == "0":
                clauses.append("content/NumberOfBedrooms eq 0")
            elif b.endswith("+"):
                clauses.append(f"content/NumberOfBedrooms ge {int(b.rstrip('+'))}")
            else:
                clauses.append(f"content/NumberOfBedrooms eq {int(b)}")
        filt += f" and ({' or '.join(clauses)})"
    # Server-side barrio filter: content/City contains the neighbourhood name.
    # Using OData eq reduces pages needed from O(all-province) to O(barrio-only).
    if barrios:
        city_clauses = " or ".join(f"content/City eq '{b}'" for b in barrios)
        filt += f" and ({city_clauses})"

    body = {
        "count":     True,
        "skip":      (page_num - 1) * 24,
        "top":       24,
        "searchMode": "any",
        "queryType": "full",
        "search":    "*",
        "filter":    filt,
        "orderby":   "content/LastUpdatedOnWeb desc",
    }

    try:
        data = await asyncio.to_thread(_remax_api_post, body)
    except Exception as e:
        sys.stderr.write(f"  [remax-api p{page_num}] error: {e}\n")
        return []

    listings = data.get("value", [])
    sys.stderr.write(
        f"  [remax-api p{page_num}] {len(listings)} items | "
        f"total={data.get('@odata.count', '?')} tipo={tipo_id} txn={txn_id}\n"
    )

    results = []
    for item in listings:
        c = item.get("content", {})

        # URL from Spanish short link
        short_link = next(
            (s["ShortLink"] for s in c.get("ShortLinks", []) if s.get("LanguageCode") == "es-PY"),
            "",
        )
        if not short_link:
            continue
        url = f"https://www.remax.com.py/{short_link}"

        # Title: first non-empty line of Spanish description (descriptions use <br /> as line break)
        descs   = c.get("ListingDescriptions", [])
        es_desc = next(
            (d.get("Description", "") for d in descs if d.get("LanguageCode") == "es-PY"),
            "",
        )
        # Normalise <br /> and \r to \n, strip remaining HTML, take first meaningful line
        es_text = re.sub(r"\r?<br\s*/?>", "\n", es_desc)
        es_text = re.sub(r"<[^>]+>|\r", "", es_text)
        title_lines = [l.strip() for l in es_text.split("\n") if l.strip()]
        title = title_lines[0][:200] if title_lines else ""
        if not title:
            full  = c.get("FullTextSearch", "")
            title = re.sub(r"\s+", " ", full.split(" For Sale ")[0].split(" For Rent ")[0]).strip()[:150]

        # Price
        price = _remax_format_price(
            c.get("ListingPrice", 0),
            c.get("ListingCurrency", "USD"),
            txn_id,
        )

        # Location: City + Province
        city      = c.get("City", location)
        province  = c.get("Province", "")
        location_ = f"{city}, {province}" if province and province != city else city

        # Photo
        imgs  = c.get("ListingImages", [])
        photo = _REMAX_PHOTO_CDN.format(imgs[0]["FileName"]) if imgs else None

        # m²: prefer BuiltArea (constructed), fall back to TotalArea (includes land)
        built = c.get("BuiltArea") or None
        total = c.get("TotalArea") or None
        metros = built if built else total

        results.append({
            "source":   "remax.com.py",
            "title":    title or "Sin título",
            "price":    price,
            "location": location_,
            "url":      url,
            "photo":    photo,
            "bedrooms": c.get("NumberOfBedrooms") or None,
            "metros":   metros,
            # Only assert ciudad when the province ID is unique to one city.
            # Shared provinces (Central, Cordillera, Alto Paraná) return results
            # from multiple cities — let Tier-2 text scan resolve the actual one.
            "ciudad":   None if province_id in _REMAX_SHARED_PROVINCE_IDS else location,
        })

    return results


async def _scrape_view(ctx, op: str, tipo: str, location: str, page_num: int,
                       barrios: list | None = None, bedrooms: list | None = None):
    """view.com.py — uses their XHR API (/Inicio/TraerPropiedades) directly."""
    tipo_key = tipo.lower() if tipo else ""
    if tipo_key and tipo_key not in VIEW_TIPO_MAP:
        sys.stderr.write(
            f"  [view.com.py] tipo {tipo!r} has no view category — running unfiltered\n"
        )
        categoria_id = ""
    else:
        categoria_id = VIEW_TIPO_MAP.get(tipo_key, "")
    venta_o_alquiler = _VIEW_OP_MAP.get(op, "2")  # "2"=Venta, "1"=Alquiler
    area_id          = barrios[0] if barrios else ""

    sys.stderr.write(
        f"  [view.com.py] tipo={tipo or '(todos)'} → categoryId={categoria_id or '(todos)'} | "
        f"op={op} → ventaOAlquiler={venta_o_alquiler} | area={area_id!r}\n"
    )

    params = {
        "ventaOAlquiler": venta_o_alquiler,
        "categoryId":     categoria_id if categoria_id else "",
        "areaId":         area_id,
        "featured":       "",
        "pageNumber":     page_num,
    }

    try:
        data = await asyncio.to_thread(_view_api_get, params)
    except Exception as e:
        sys.stderr.write(f"  [view p{page_num}] error: {e}\n")
        return [], 0, False

    props    = data.get("propiedades") or []
    total    = data.get("totalCount", 0)
    has_more = data.get("hasMoreResults", False)

    results = []
    city_passed = 0
    city_dropped = 0
    loc_n = _normalize_text(location) if location else ""

    for p in props:
        is_sale = p.get("Sale", False)
        is_rent = p.get("Rent", False)

        # Safety-net: server filter by ventaOAlquiler is now active, but Sale/Rent
        # flags provide an additional client-side verification.
        if op == "venta" and not is_sale:
            continue
        if op == "alquiler" and not is_rent:
            continue

        title = (p.get("Title") or "").strip()[:200]

        # Pick price string based on operation
        if op == "alquiler" and is_rent:
            price_str = (p.get("FormattedRentPrice") or "").strip()
            currency  = p.get("RentCurrencyName", "D")
        else:
            price_str = (p.get("FormattedSalePrice") or "").strip()
            currency  = p.get("SaleCurrencyName", "D")

        # Normalize: "D" = USD, "P" = PYG
        if price_str and not price_str.startswith("₲"):
            if currency == "D" or "$" in price_str:
                price_str = price_str.replace("$", "").strip()
                price_str = f"USD {price_str}" if price_str else "Consultar"
            elif currency == "P":
                price_str = f"₲ {price_str.replace('₲','').strip()}"
        if not price_str or price_str in ("0", "₲ 0"):
            price_str = "Consultar"

        area    = (p.get("AreaName") or "").strip()
        city    = (p.get("CityName") or "").strip()
        addr    = (p.get("Address") or "").strip()
        loc_str = area or city or addr or location

        # City sanity check: drop only when CityName is known and clearly mismatches.
        # _normalize_text strips diacritics so "Asunción" == "asuncion".
        # When CityName is empty we cannot verify — pass through (inclusive fallback).
        if location and city:
            city_n = _normalize_text(city)
            if loc_n in city_n or city_n in loc_n:
                sys.stderr.write(
                    f"  [view.com.py] city check: {city!r} → normalized {city_n!r} → MATCH\n"
                )
                city_passed += 1
            else:
                sys.stderr.write(
                    f"  [view.com.py] city check: {city!r} → normalized {city_n!r} → no match, dropped\n"
                )
                city_dropped += 1
                continue
        elif location and not city:
            sys.stderr.write(f"  [view] ciudad no verificada (CityName vacío): {title[:50]!r}\n")

        prop_id = p.get("Id")
        url = (f"https://www.view.com.py/Inicio/Detalle/{prop_id}"
               if prop_id else "https://www.view.com.py/Inicio/Propiedades")

        photo = p.get("MainPicture") or (p.get("Pictures") or [None])[0]

        # m²: prefer constructed area, fall back to land area
        m2_built = p.get("MetersSquaredConstructed") or None
        m2_land  = p.get("MetersSquared") or None
        metros   = m2_built if m2_built else m2_land

        # Structured tipo from the API's CategoryName field — ground truth for
        # the Tier 1 filter check.  Normalise (lowercase + strip accents) before
        # lookup so "Galpón" → "galpon" → "depósito/tinglado" etc.
        cat_raw  = (p.get("CategoryName") or "").strip()
        cat_norm = _normalize_text(cat_raw)
        cat_tipo = _VIEW_CATEGORY_TO_TIPO.get(cat_norm)

        results.append({
            "source":   "view.com.py",
            "title":    title or "Sin título",
            "price":    price_str,
            "location": loc_str,
            "url":      url,
            "photo":    photo or None,
            "bedrooms": p.get("Bedrooms") or None,
            "metros":   metros,
            "tipo":     cat_tipo,   # canonical tipo from API; None if unknown
            # ciudad is set here when CityName passed the sanity check above.
            # When CityName was empty we still include the listing (inclusive),
            # but can't assert the city — leave ciudad None for Tier 2/3.
            "ciudad":   location if city else None,
        })

    if location:
        sys.stderr.write(
            f"  [view.com.py] {len(props)} listings | {city_passed} passed city check"
            f" | {city_dropped} dropped\n"
        )
    return results, len(props), has_more


# ── asuncion.estate ───────────────────────────────────────────────────────────

async def _scrape_asuncion_estate(ctx, op: str, tipo: str, location: str, page_num: int, barrios: list | None = None, bedrooms: list | None = None):
    if page_num > 1:
        return []  # asuncion.estate shows all results on a single page

    tipo_slug = AE_TIPO_MAP.get(tipo.lower(), "")
    op_slug   = AE_OP_MAP.get(op, "venta")
    city_slug = AE_CITY_MAP.get(slugify(location), "asuncion")

    if not tipo_slug:
        return []

    url = f"https://asuncion.estate/es/{city_slug}/{op_slug}/{tipo_slug}"
    if barrios:
        url += f"?district={slugify(barrios[0])}"

    page = await ctx.new_page()
    results: list[dict] = []
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
        try:
            await page.wait_for_selector(".listing-style7", timeout=8_000)
        except Exception:
            return []

        cards = await page.query_selector_all(".listing-style7")
        for card in cards:
            a_el = await card.query_selector("h5.list-title a")
            if not a_el:
                continue
            title = (await a_el.inner_text()).strip()
            href  = (await a_el.get_attribute("href") or "").strip()
            if href and not href.startswith("http"):
                href = "https://asuncion.estate" + href

            # Photo is a CSS background-image, not <img>
            photo = None
            thumb = await card.query_selector(".list-thumb-img")
            if thumb:
                style = await thumb.get_attribute("style") or ""
                m = re.search(r'url\(["\']?(https?://[^"\')\s]+)["\']?\)', style)
                if m:
                    photo = m.group(1)

            price_el  = await card.query_selector(".list-price span")
            price_raw = (await price_el.inner_text()).strip() if price_el else ""
            price_text = re.sub(r'[Uu]\$[Ss]', 'USD', price_raw).strip() or "Consultar"

            # Third .property-meta link is the neighbourhood.
            # Guard: reject if the extracted text is a property-type or operation
            # word — that means the card has fewer barrio links than expected and
            # we picked up the tipo/op chip instead.
            _AE_NON_BARRIO = {
                "casa", "apartamento", "departamento", "duplex", "dúplex",
                "terreno", "lote", "local", "oficina", "edificio",
                "compra", "venta", "alquiler",
            }
            meta_links = await card.query_selector_all(".property-meta a")
            neighborhood = ""
            candidates = [2, -1] if len(meta_links) >= 3 else ([-1] if meta_links else [])
            for idx in candidates:
                candidate = (await meta_links[idx].inner_text()).strip()
                if candidate.lower() not in _AE_NON_BARRIO:
                    neighborhood = candidate
                    break

            # Bedrooms and m² — scan all .list-meta2 links and classify by content.
            # Links with an "m" suffix are area; small integers (≤20) are bedroom counts.
            # Skip bedroom extraction for land types — they don't have bedrooms and
            # zone/reference numbers would otherwise be misread as bedroom counts.
            _AE_NO_BEDS = {"terreno", "terreno/lote", "estancia/campo"}
            extract_beds = tipo.lower() not in _AE_NO_BEDS
            bedrooms_val: int | None = None
            metros_val:   float | None = None
            meta2 = await card.query_selector_all(".list-meta2 a")
            for meta_link in meta2:
                text = (await meta_link.inner_text()).strip()
                if re.search(r'\d+\s*m', text, re.I):
                    m2_m = re.search(r'(\d+)', text)
                    if m2_m and metros_val is None:
                        metros_val = float(m2_m.group(1))
                elif extract_beds:
                    bd_m = re.search(r'(\d+)', text)
                    if bd_m and bedrooms_val is None:
                        bd_val = int(bd_m.group(1))
                        if bd_val <= 20:
                            bedrooms_val = bd_val

            results.append({
                "source":   "asuncion.estate",
                "title":    title,
                "price":    price_text,
                "location": neighborhood or location,
                "url":      href,
                "photo":    photo,
                "bedrooms": bedrooms_val,
                "metros":   metros_val,
                "ciudad":   location,
            })

        sys.stderr.write(f"  [asuncion.estate p{page_num}] {len(results)} listings\n")
        return results

    except Exception as e:
        sys.stderr.write(f"[asuncion.estate] error: {e}\n")
        return []
    finally:
        await page.close()



# ── mersan.com.py ─────────────────────────────────────────────────────────────

from utils.mersan_ids import get_tipo_id, get_ciudad_id, get_barrio_id
from utils.text import normalize as _normalize_text

# Bedroom count extraction: number + up to 2 optional adjective words + keyword.
# Handles "2 AMPLIOS DORM.", "3 GRANDES dormitorios", "4 SUITES", "2 HABITACIONES".
_MERSAN_DORM_RE = re.compile(
    r'(\d+)(?:\s+\w+){0,2}\s*'
    r'(?:dormitorios?|dorm(?:\.|s)?|habitaci(?:o|ó)n(?:es)?|hab|suites?|cuartos?)',
    re.IGNORECASE,
)


def _parse_mersan_price(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        return "Consultar"
    is_gs = "gs" in raw.lower()
    digits = re.sub(r'[^\d]', '', raw)
    if not digits:
        return "Consultar"
    amount = int(digits)
    if amount == 0:
        return "Consultar"
    if is_gs:
        return f"Gs. {amount:,}".replace(',', '.')
    return f"USD {amount:,}"


async def _scrape_mersan(ctx, op: str, tipo: str, location: str, page_num: int,
                         bedrooms: list | None = None, barrios: list | None = None):
    if page_num > 1:
        return []  # Mersan muestra todos los resultados en una sola página

    op_slug    = "alquiler" if op == "alquiler" else "venta"
    tipo_id    = get_tipo_id(tipo) if tipo else None
    ciudad_id  = get_ciudad_id(location) if location else None
    barrio_id  = None
    if barrios:
        barrio_id = get_barrio_id(barrios[0])
        if not barrio_id:
            sys.stderr.write(f"  [mersan.com.py] barrio {barrios[0]!r} sin ID — parámetro omitido\n")

    # Bedroom filter: pass only when a single exact count is requested
    non_mono = [b for b in (bedrooms or []) if b != "0"]
    dormitorio = int(non_mono[0].rstrip("+")) if len(non_mono) == 1 else ""

    # Build URL — omit params with no ID rather than sending a bad value
    qs_parts = [
        "q=",
        f"operacion={op_slug}",
        f"tipo={tipo_id}" if tipo_id else "tipo=todos",
        f"dormitorio={dormitorio}",
        f"ciudad={ciudad_id}" if ciudad_id else "ciudad=todas",
        f"barrio={barrio_id}" if barrio_id else "barrio=todos",
        "piscina=todos",
        "precio-min=",
        "precio-max=",
    ]
    search_url = "https://www.mersan.com.py/buscador?" + "&".join(qs_parts)

    sys.stderr.write(
        f"  [mersan.com.py] tipo={tipo or '(todos)'}→{tipo_id or '—'} | "
        f"ciudad={location or '(todas)'}→{ciudad_id or '—'} | "
        f"barrio={barrios[0] if barrios else '(todos)'}→{barrio_id or '—'}\n"
    )
    sys.stderr.write(f"  [mersan.com.py] URL: {search_url}\n")

    page = await ctx.new_page()
    await page.add_init_script(
        "Object.defineProperty(window,'outerHeight',{get:()=>800});"
        "Object.defineProperty(window,'outerWidth',{get:()=>1280});"
    )
    await _MERSAN_STEALTH.apply_stealth_async(page)

    try:
        # Warm-up en homepage para pasar la protección anti-bot
        await page.goto("https://www.mersan.com.py/", wait_until="domcontentloaded", timeout=25_000)
        await page.wait_for_timeout(3_500)

        await page.goto(search_url, wait_until="domcontentloaded", timeout=20_000)
        await page.wait_for_timeout(1_500)

        cards = await page.query_selector_all(".propiedad")
        results: list[dict] = []

        for card in cards:
            a_el = await card.query_selector("a")
            if not a_el:
                continue
            url = (await a_el.get_attribute("href") or "").strip()

            h3 = await card.query_selector("h3")
            title = (await h3.inner_text()).strip() if h3 else ""
            if not title:
                continue

            # Extract bedroom count from title ("2 DORM.", "3 dormitorios", etc.)
            dorm_m = _MERSAN_DORM_RE.search(title)
            bedrooms_val = int(dorm_m.group(1)) if dorm_m else None

            # Location: first <p> without .price; strip "Zona " prefix and
            # append city so apply_filters barrio check can see the comma.
            loc_text = ""
            for p_el in await card.query_selector_all("p"):
                if not await p_el.query_selector(".price"):
                    t = (await p_el.inner_text()).strip()
                    if t:
                        loc_text = re.sub(r'^Zona\s+', '', t, flags=re.IGNORECASE).strip()
                        break
            # Add city suffix so the comma-based barrio filter applies correctly
            city_label = location.title() if location else "Paraguay"
            loc_str = f"{loc_text}, {city_label}" if loc_text else city_label

            price_el  = await card.query_selector(".price")
            price_raw = (await price_el.inner_text()).strip() if price_el else ""
            price_text = _parse_mersan_price(price_raw)

            results.append({
                "source":   "mersan.com.py",
                "title":    title,
                "price":    price_text,
                "location": loc_str,
                "url":      url,
                "photo":    None,   # Mersan no incluye fotos en las tarjetas de listado
                "bedrooms": bedrooms_val,
                "metros":   None,   # m² no disponible en las tarjetas
                # Mersan's server-side tipo filter is strict (verified: 0 wrong-tipo
                # in audit).  Attach the searched canonical tipo so the Tier 1 filter
                # trusts these listings rather than requiring a title keyword match.
                "tipo":     tipo if tipo else None,
                "ciudad":   location if location else None,
            })

        sys.stderr.write(f"  [mersan.com.py] {len(cards)} tarjetas → {len(results)} resultados\n")
        return results

    except Exception as e:
        sys.stderr.write(f"[mersan] error: {e}\n")
        return []
    finally:
        await page.close()


# ── Dispatcher ────────────────────────────────────────────────────────────────

_SCRAPERS = {
    "infocasas.com.py":          _scrape_infocasas,
    "brokers.com.py":            _scrape_brokers,
    "century21.com.py":          _scrape_century21,
    "remax.com.py":              _scrape_remax,
    "view.com.py":               _scrape_view,
    "asuncion.estate":           _scrape_asuncion_estate,
    "mersan.com.py":             _scrape_mersan,
}

# Safety cap: prevents infinite loops if a site's pagination is broken.
# Normal stopping condition is collecting enough filter-matched results.
_MAX_PAGES = 30
# view.com.py returns 6 items/page; 25 pages covers ~150 listings per area.
# Prevents endless crawling when city filtering drops most pages.
_VIEW_PAGE_CAP = 25


async def _scrape_site(browser, name: str, fn, params: dict):
    """
    Scrape one site sequentially — page by page — stopping as soon as
    `limit` filter-matched results are collected or the site runs out of pages.

    Filtering is applied per page (Option A) so the limit reflects actual
    matched listings, not raw scraped cards.
    """
    from utils.filters import apply_filters

    limit    = int(params.get("resultsPerSite", 15))
    op       = "alquiler" if params.get("operation") == "Alquiler" else "venta"
    location = (params.get("location") or "Asuncion").strip()
    barrios  = [b.strip() for b in (params.get("barrios") or []) if b.strip()]
    beds_raw = params.get("bedrooms")
    if isinstance(beds_raw, list):
        bedrooms = [str(b) for b in beds_raw if str(b).strip()]
    elif beds_raw:
        bedrooms = [str(beds_raw).strip()]
    else:
        bedrooms = []

    # When multiple tipos are selected, skip URL-level tipo filtering so all types
    # are fetched and apply_filters handles the OR logic across propTypes.
    prop_types = [t.strip() for t in (params.get("propTypes") or []) if str(t).strip()]
    tipo = "" if len(prop_types) > 1 else params.get("propType", "")

    context = await browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
    )
    await context.route("**/*", _block)

    try:
        collected, raw_total, pages_scraped = await _collect(
            name, fn, context, op, tipo, location, barrios, bedrooms,
            limit, params, apply_filters,
        )
        result   = collected[:limit]
        returned = len(result)
        warn     = " ⚠️" if returned == 0 else ""
        sys.stderr.write(
            f"[{name}] limit={limit} | pages={pages_scraped} | raw={raw_total} | "
            f"matched={len(collected)} | returned={returned}{warn}\n"
        )
        return result
    except Exception as e:
        sys.stderr.write(f"[{name}] site error: {e}\n")
        return []
    finally:
        await context.close()


async def _collect(
    name, fn, context, op, tipo, location, barrios, bedrooms,
    limit, params, apply_filters,
) -> tuple[list, int, int]:
    """
    Dispatch to the per-site sequential collection strategy.
    Returns (matched_listings, raw_card_count, pages_scraped).
    """
    if name == "infocasas.com.py":
        return await _collect_infocasas(
            fn, context, op, tipo, location, barrios, bedrooms, limit, params, apply_filters
        )
    elif name == "view.com.py":
        return await _collect_view(
            fn, context, op, tipo, location, barrios, bedrooms, limit, params, apply_filters
        )
    elif name == "mersan.com.py":
        return await _collect_mersan(
            fn, context, op, tipo, location, barrios, bedrooms, limit, params, apply_filters
        )
    else:
        # brokers, century21, remax, asuncion.estate — generic sequential loop
        return await _collect_sequential(
            fn, context, op, tipo, location, barrios, bedrooms, limit, params, apply_filters
        )


async def _collect_sequential(
    fn, context, op, tipo, location, barrios, bedrooms,
    limit, params, apply_filters,
) -> tuple[list, int, int]:
    """Generic sequential page loop: fetch → filter → count → stop if enough."""
    collected: list[dict] = []
    seen_urls: set[str]   = set()
    raw_total = 0
    page_num  = 1

    while len(collected) < limit and page_num <= _MAX_PAGES:
        kwargs: dict = {"bedrooms": bedrooms}
        if fn in (_scrape_century21, _scrape_remax, _scrape_asuncion_estate, _scrape_mersan):
            kwargs["barrios"] = barrios or None

        page_results = await fn(context, op, tipo, location, page_num, **kwargs)
        if not page_results:
            break

        raw_total += len(page_results)
        for item in apply_filters(page_results, params):
            key = item.get("url", "")
            if key and key in seen_urls:
                continue
            if key:
                seen_urls.add(key)
            collected.append(item)

        page_num += 1

    return collected, raw_total, page_num - 1


# ── Mersan detail-page m² enrichment ─────────────────────────────────────────

_MERSAN_DETAIL_CONCURRENCY = 5

# Matches "Construída: 345 M2", "Construida: 345 m²", etc.
_MERSAN_M2C_RE = re.compile(r'constru[íi]da?:\s*([\d.,]+)\s*m[²2]', re.IGNORECASE)
# Matches "Terreno: 318 M2", "Terreno: 1.025 m²", etc.
_MERSAN_M2T_RE = re.compile(r'terreno:\s*([\d.,]+)\s*m[²2]', re.IGNORECASE)


async def _mersan_fetch_m2(context, listing: dict) -> None:
    """Fetch one Mersan detail page and attach m2_construido / m2_terreno in-place."""
    url  = listing.get("url", "")
    slug = url.rstrip("/").split("/")[-1]
    page = await context.new_page()
    try:
        await _MERSAN_STEALTH.apply_stealth_async(page)
        await page.goto(url, wait_until="domcontentloaded", timeout=20_000)
        await page.wait_for_timeout(800)

        m2c = m2t = None
        for li in await page.query_selector_all(".print-dep-cap li"):
            text = (await li.inner_text()).strip()
            m = _MERSAN_M2C_RE.match(text)
            if m:
                m2c = _parse_py_number(m.group(1))
                continue
            m = _MERSAN_M2T_RE.match(text)
            if m:
                m2t = _parse_py_number(m.group(1))

        listing["m2_construido"] = m2c
        listing["m2_terreno"]    = m2t
        listing["metros"]        = m2c or m2t  # prefer built; fallback to land

        label = m2c or m2t
        sys.stderr.write(f"  [mersan.com.py] detail page OK: {slug!r} → {label} m²\n")
    except Exception:
        sys.stderr.write(f"  [mersan.com.py] detail page failed: {slug!r} → metros=None\n")
    finally:
        await page.close()


async def _collect_mersan(
    fn, context, op, tipo, location, barrios, bedrooms,
    limit, params, apply_filters,
) -> tuple[list, int, int]:
    """
    Mersan-specific collector.  All results come from a single page; the only
    special behaviour is on-demand detail-page fetches when a m² filter is active.
    """
    m2_active = any(
        params.get(k) not in (None, "")
        for k in ("m2ConstruidoMin", "m2ConstruidoMax", "m2TerrenoMin", "m2TerrenoMax")
    )

    raw = await fn(context, op, tipo, location, 1,
                   bedrooms=bedrooms, barrios=barrios or None)
    raw_count = len(raw)

    if m2_active:
        # Cap to listings that could fill the limit — mersan rarely has more than ~20.
        to_enrich = raw[:limit]
        sys.stderr.write(
            f"  [mersan.com.py] m² filter active → fetching {len(to_enrich)} "
            f"detail pages (concurrency={_MERSAN_DETAIL_CONCURRENCY})\n"
        )
        sem = asyncio.Semaphore(_MERSAN_DETAIL_CONCURRENCY)

        async def _guarded(lst):
            async with sem:
                await _mersan_fetch_m2(context, lst)

        await asyncio.gather(*[_guarded(lst) for lst in to_enrich])
    else:
        sys.stderr.write("  [mersan.com.py] m² filter inactive → skipping detail pages\n")

    matched = apply_filters(raw, params)
    return matched, raw_count, 1


async def _collect_infocasas(
    fn, context, op, tipo, location, barrios, bedrooms,
    limit, params, apply_filters,
) -> tuple[list, int, int]:
    """
    infocasas only supports one barrio per URL.
    Single barrio → sequential loop.
    Multiple barrios → run each barrio's loop in parallel, combine, trim to limit.
    """
    if len(barrios) <= 1:
        return await _ic_barrio_loop(
            fn, context, op, tipo, location, barrios or [None], bedrooms,
            limit, params, apply_filters,
        )

    # Multiple barrios: parallel sequential loops, one per barrio
    tasks = [
        _ic_barrio_loop(fn, context, op, tipo, location, [b], bedrooms,
                        limit, params, apply_filters)
        for b in barrios
    ]
    results_per_barrio = await asyncio.gather(*tasks, return_exceptions=True)

    combined:  list[dict] = []
    seen_urls: set[str]   = set()
    raw_total  = 0
    pages_max  = 0

    for r in results_per_barrio:
        if not isinstance(r, tuple):
            continue
        barrio_listings, barrio_raw, barrio_pages = r
        raw_total += barrio_raw
        pages_max  = max(pages_max, barrio_pages)
        for item in barrio_listings:
            key = item.get("url", "")
            if key and key in seen_urls:
                continue
            if key:
                seen_urls.add(key)
            combined.append(item)

    return combined, raw_total, pages_max


async def _ic_barrio_loop(
    fn, context, op, tipo, location, barrios, bedrooms,
    limit, params, apply_filters,
) -> tuple[list, int, int]:
    """Sequential page loop for a single infocasas barrio (or no barrio)."""
    collected: list[dict] = []
    seen_urls: set[str]   = set()
    raw_total = 0
    page_num  = 1

    while len(collected) < limit and page_num <= _MAX_PAGES:
        page_results = await fn(
            context, op, tipo, location, page_num,
            barrios=barrios if barrios[0] else None,
            bedrooms=bedrooms,
        )
        if not page_results:
            break

        raw_total += len(page_results)
        for item in apply_filters(page_results, params):
            key = item.get("url", "")
            if key and key in seen_urls:
                continue
            if key:
                seen_urls.add(key)
            collected.append(item)

        page_num += 1

    return collected, raw_total, page_num - 1


async def _collect_view(
    fn, context, op, tipo, location, barrios, bedrooms,
    limit, params, apply_filters,
) -> tuple[list, int, int]:
    """
    view.com.py areas are separate API endpoints (one per areaId string).

    When the user selected specific barrios: expand each to matching view area
    names and query them in parallel — same as before.

    When no barrios are selected but a city is specified: automatically expand
    the city to all its barrios via barrios_of_city(), resolve each barrio to
    view area names, and query those instead of scraping all of Paraguay with
    areaId="".  This replaces the old "scrape nationwide + filter after" approach.
    """
    from utils.locations import barrios_of_city

    # Cap on view areaId queries per city-expansion search.  Asunción has ~40
    # barrios which may expand to ~60 view area name variants.
    _VIEW_CITY_AREA_CAP = 80

    async def _view_area_loop(area_name: str) -> tuple[list, int, int]:
        collected: list[dict] = []
        raw_total = 0
        page_num  = 1
        while True:
            page_results, raw_len, has_more = await fn(
                context, op, tipo, location, page_num,
                barrios=[area_name], bedrooms=bedrooms,
            )
            raw_total += raw_len

            matched_this_page = 0
            for item in apply_filters(page_results, params):
                collected.append(item)
                matched_this_page += 1

            # Stop only on raw API signals, not on filtered count. A page with
            # 0 matches after filtering may still have inventory on the next.
            if raw_len == 0 or not has_more:
                sys.stderr.write(
                    f"  [view p{page_num}] {raw_len} raw | hasMore={has_more}"
                    f" | {matched_this_page} matched | stopping (end of inventory)\n"
                )
                break
            if len(collected) >= limit:
                sys.stderr.write(
                    f"  [view p{page_num}] {raw_len} raw | hasMore={has_more}"
                    f" | {matched_this_page} matched | stopping (limit reached)\n"
                )
                break
            if page_num >= _VIEW_PAGE_CAP:
                sys.stderr.write(
                    f"  [view] page cap ({_VIEW_PAGE_CAP}) reached —"
                    f" {len(collected)} matched\n"
                )
                break
            sys.stderr.write(
                f"  [view p{page_num}] {raw_len} raw | hasMore={has_more}"
                f" | {matched_this_page} matched | continuing\n"
            )
            page_num += 1
        return collected, raw_total, page_num

    def _resolve_to_view_areas(barrio_list: list[str]) -> list[str]:
        """Expand a list of barrio names into view.com.py area name strings."""
        view_areas: list[str] = []
        seen_area: set[str]  = set()
        for b in barrio_list:
            matches = _find_view_areas(b)
            if matches:
                for a in matches:
                    if a not in seen_area:
                        view_areas.append(a)
                        seen_area.add(a)
            else:
                sys.stderr.write(
                    f"  [view.com.py] barrio {b!r} no areaId match — skipped\n"
                )
        return view_areas

    # ── Determine which view areas to query ───────────────────────────────
    if barrios:
        # User specified barrios explicitly → expand only those
        for b in barrios:
            matches = _find_view_areas(b)
            sys.stderr.write(
                f"  [view.com.py] barrio {b!r} → {len(matches)} variant(s)"
                + (": " + ", ".join(matches) if matches else "") + "\n"
            )
        target_areas = _resolve_to_view_areas(barrios)
        if not target_areas:
            return [], 0, 0

    elif location:
        # City-only search: expand city → all its barrios → view area names.
        # This replaces the old areaId="" (all-of-Paraguay) approach.
        city_barrios = barrios_of_city(location)
        if city_barrios:
            target_areas = _resolve_to_view_areas(city_barrios)
            if len(target_areas) > _VIEW_CITY_AREA_CAP:
                sys.stderr.write(
                    f"  [view.com.py] city={location!r} → {len(target_areas)} area variants,"
                    f" capping at {_VIEW_CITY_AREA_CAP}\n"
                )
                target_areas = target_areas[:_VIEW_CITY_AREA_CAP]
            sys.stderr.write(
                f"  [view.com.py] city={location!r} → {len(city_barrios)} barrios"
                f" → {len(target_areas)} areaId variants → querying\n"
            )
        else:
            # Unknown city → fall back to unfiltered (old behaviour)
            sys.stderr.write(
                f"  [view.com.py] city={location!r} unknown — using unfiltered search\n"
            )
            target_areas = [""]
    else:
        target_areas = [""]

    area_results = await asyncio.gather(
        *[_view_area_loop(a) for a in target_areas], return_exceptions=True
    )

    combined:  list[dict] = []
    seen_urls: set[str]   = set()
    raw_total = 0
    pages_max = 0

    for r in area_results:
        if not isinstance(r, tuple):
            continue
        area_listings, area_raw, area_pages = r
        raw_total += area_raw
        pages_max  = max(pages_max, area_pages)
        for item in area_listings:
            key = item.get("url", "")
            if key and key in seen_urls:
                continue
            if key:
                seen_urls.add(key)
            combined.append(item)

    sys.stderr.write(
        f"  [view.com.py] merged {sum(len(r[0]) for r in area_results if isinstance(r, tuple))}"
        f" listings across {len(target_areas)} areas | {len(combined)} after dedup\n"
    )
    return combined, raw_total, pages_max


# ── Public API ────────────────────────────────────────────────────────────────

async def _search_async(params: dict) -> list[dict]:
    sources = params.get("sources") or list(_SCRAPERS.keys())
    active  = [s for s in sources if s in _SCRAPERS]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-gpu",
                "--disable-extensions",
            ],
        )
        tasks = [
            _scrape_site(browser, name, _SCRAPERS[name], params)
            for name in active
        ]
        per_site = await asyncio.gather(*tasks, return_exceptions=True)
        await browser.close()

    results: list[dict] = []
    for r in per_site:
        if isinstance(r, list):
            results.extend(r)
    return results


def search_properties(params: dict) -> list[dict]:
    """Sync entry point — called by runner.py."""
    return asyncio.run(_search_async(params))
