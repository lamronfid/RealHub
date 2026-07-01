"""
agent_scraper.py — Find real-estate agent profiles on RE/MAX and Century21 Paraguay.

Reads a JSON task from stdin, writes results as JSON to stdout.

Actions:
  search_agent  — fuzzy-search agent by name, return ranked matches with listing counts
  import_agent  — fetch all listings for a confirmed agent profile
"""

from __future__ import annotations

import asyncio
import difflib
import http.client
import json
import re
import ssl
import sys
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
import unicodedata

from playwright.async_api import async_playwright, Page

# ── SSL context ────────────────────────────────────────────────────────────────

_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode    = ssl.CERT_NONE

# ── Fuzzy name matching ────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.split())


def similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, _norm(a), _norm(b)).ratio()


def best_matches(candidates: list[dict], query: str, key: str = "name", threshold: float = 0.35) -> list[dict]:
    scored = [
        {**c, "similarity": round(similarity(c.get(key, ""), query), 3)}
        for c in candidates
    ]
    return sorted(
        [c for c in scored if c["similarity"] >= threshold],
        key=lambda c: c["similarity"],
        reverse=True,
    )


# ── RE/MAX helpers ─────────────────────────────────────────────────────────────

_REMAX_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _remax_post(path: str, body: dict) -> dict:
    conn = http.client.HTTPSConnection("www.remax.com.py", timeout=15, context=_SSL_CTX)
    conn.request(
        "POST", path, body=json.dumps(body),
        headers={
            "Content-Type": "application/json",
            "Origin":  "https://www.remax.com.py",
            "Referer": "https://www.remax.com.py/",
            "User-Agent": _REMAX_UA,
        },
    )
    resp = conn.getresponse()
    data = json.loads(resp.read())
    conn.close()
    return data


# RE/MAX profile URL pattern:
# /agent/es-py/agentes/paraguay/{barrio}/{slug}/{id}
_REMAX_PROFILE_RE = re.compile(
    r'/agent/es-py/agentes/[^/]+/[^/]+/([^/]+)/(\d+)'
)


async def _remax_profile_details(page: Page, profile_url: str) -> tuple[str, str, int, str]:
    """
    Navigate to a RE/MAX agent profile and return (name, agency, listings_count, photo).
    Extracts listing count from the "Mis propiedades (N)" text that appears on the page.
    """
    try:
        await page.goto(profile_url, timeout=25_000, wait_until="networkidle")
        text = await page.inner_text("body")

        # Name: first h1 on the page
        name = ""
        h1 = await page.query_selector("h1")
        if h1:
            name = (await h1.inner_text()).strip()

        # Agency: find first "RE/MAX <office>" line in page text
        agency = "RE/MAX Paraguay"
        for ln in (ln.strip() for ln in text.split("\n") if ln.strip()):
            if ln.upper().startswith("RE/MAX") and len(ln) > 6:
                agency = ln
                break

        # Listing count from "Mis propiedades (N)"
        m = re.search(r'Mis propiedades\s*\((\d+)\)', text)
        count = int(m.group(1)) if m else 0

        # Photo: find first img that looks like a profile photo
        photo = ""
        for sel in ["img[class*='profile']", "img[class*='agent']", "img[class*='foto']", "header img", "main img"]:
            img = await page.query_selector(sel)
            if img:
                photo = (await img.get_attribute("src")) or ""
                if photo:
                    break

        return name, agency, count, photo

    except Exception as e:
        sys.stderr.write(f"[remax-profile] {profile_url}: {e}\n")
        return "", "RE/MAX Paraguay", 0, ""


async def search_remax_agents(name: str) -> list[dict]:
    """
    Search RE/MAX Paraguay's ProfileSearch page for agents by name.
    Uses Playwright (the page is React-rendered). Navigates to each
    profile to extract the agent name, agency, and listing count.
    """
    results = []
    encoded = name.replace(" ", "+")
    url = (
        f"https://www.remax.com.py/ProfileSearch"
        f"?countryId=114&country=Paraguay&searchType=agent&name={encoded}"
    )

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        ctx  = await browser.new_context(user_agent=_REMAX_UA)
        page = await ctx.new_page()
        try:
            await page.goto(url, timeout=30_000, wait_until="networkidle")

            # Collect all unique agent profile URLs from agent card links
            links = await page.query_selector_all("a[href*='/agent/es-py/agentes/']")
            seen_ids: set[str] = set()
            profile_entries: list[tuple[str, str, str]] = []  # (agent_id, slug, profile_url)

            for link in links:
                href = (await link.get_attribute("href")) or ""
                m = _REMAX_PROFILE_RE.search(href)
                if not m:
                    continue
                slug_part, agent_id = m.group(1), m.group(2)
                if agent_id in seen_ids:
                    continue
                seen_ids.add(agent_id)
                profile_url = (
                    href if href.startswith("http")
                    else f"https://www.remax.com.py{href}"
                )
                profile_entries.append((agent_id, slug_part, profile_url))

            # Visit each profile for details (cap at 10 to avoid long runs)
            for agent_id, slug_part, profile_url in profile_entries[:10]:
                agent_name, agency, count, photo = await _remax_profile_details(page, profile_url)
                # Fall back to slugified name if h1 was empty
                if not agent_name:
                    agent_name = slug_part.replace("-", " ").title()

                results.append({
                    "source":         "remax",
                    "agent_id":       agent_id,
                    "name":           agent_name,
                    "agency":         agency,
                    "photo":          photo or "",
                    "profile_url":    profile_url,
                    "listings_count": count,
                })

        except Exception as e:
            sys.stderr.write(f"[remax-agent] {e}\n")
        finally:
            await browser.close()

    return results


_PHOTO_CDN = "https://cdn.gryphtech.com/userimages/114/LargeWM/{}"

# Strip HTML tags from description text
_HTML_TAG_RE = re.compile(r'<[^>]+>')


def _strip_html(s: str) -> str:
    return _HTML_TAG_RE.sub("", s).strip()


async def import_remax_agent_listings(agent_id: str, profile_url: str) -> list[dict]:
    """
    Fetch all RE/MAX agent listings via the Azure Search listing index.
    Returns every available field so the caller can write directly to agent_properties.
    """
    body = {
        "count":      True,
        "top":        100,
        "searchMode": "any",
        "queryType":  "full",
        "search":     "*",
        "filter": (
            f"content/TenantId eq 6 and content/MacroRegionId eq 114 "
            f"and content/OnHoldListing eq false and content/IsViewable eq true "
            f"and content/AgentId eq {agent_id}"
        ),
        "orderby": "content/LastUpdatedOnWeb desc",
    }
    try:
        data = await asyncio.to_thread(_remax_post, "/search/listing-search/docs/search", body)
    except Exception as e:
        sys.stderr.write(f"[remax-import] API error: {e}\n")
        return []

    results = []
    for item in (data.get("value") or []):
        c = item.get("content") or item

        # ── Title ──────────────────────────────────────────────────────────────
        title = ""
        full_desc = ""
        for desc in (c.get("ListingDescriptions") or []):
            uid = str(desc.get("DescriptionTypeUID"))
            text = _strip_html(str(desc.get("Description") or ""))
            if uid == "1113":
                title = text
            if uid == "629" and not full_desc:
                full_desc = text
        geo  = (c.get("GeoDatas") or [{}])[0]
        city = geo.get("City") or c.get("City") or ""
        if not title:
            title = f"{_remax_prop_type(c).title()} en {city}"

        # ── Location ───────────────────────────────────────────────────────────
        neighborhood = geo.get("LocalZone") or c.get("LocalZone") or None
        department   = geo.get("Province") or c.get("Province") or None

        # ── Price & currency ───────────────────────────────────────────────────
        # Store raw price + original currency; no conversion — caller handles display
        raw_price = float(c.get("ListingPrice") or 0)
        api_curr  = (c.get("ListingCurrency") or "USD").upper()
        currency  = "GS" if api_curr == "PYG" else "USD"

        # ── Area ───────────────────────────────────────────────────────────────
        prop_type = _remax_prop_type(c)
        # BuiltArea / TotalArea = constructed m² for houses; TotalArea = lot m² for land
        built  = c.get("BuiltArea") or c.get("MetersSquaredConstructed")
        lot    = c.get("LotSize2") or (c.get("TotalArea") if not built else None)
        sqm_built  = float(built) if built else None
        sqm_total  = float(lot or c.get("TotalArea") or 0) or None

        # ── Rooms ──────────────────────────────────────────────────────────────
        bedrooms  = c.get("NumberOfBedrooms") or c.get("BedroomsTotal") or c.get("Bedrooms")
        bathrooms = c.get("NumberOfBathrooms") or c.get("BathroomsTotal")
        garages   = c.get("GarageSpaces") or c.get("NumberOfGarages")

        # ── Photos ─────────────────────────────────────────────────────────────
        imgs = sorted(
            (c.get("ListingImages") or []),
            key=lambda x: int(x.get("Order") or 0),
        )
        photos     = [_PHOTO_CDN.format(i["FileName"]) for i in imgs if i.get("FileName")]
        main_photo = photos[0] if photos else None

        # ── Amenities ──────────────────────────────────────────────────────────
        amenities = [
            f.get("FeatureName", "").replace("PropertyFeatures_", "")
            for f in (c.get("ListingFeatures") or [])
            if f.get("FeatureName")
        ]

        # ── URL ────────────────────────────────────────────────────────────────
        source_url = ""
        for sl in (c.get("ShortLinks") or []):
            if sl.get("LanguageCode") == "es-PY":
                source_url = f"https://www.remax.com.py/{sl['ShortLink']}"
                break

        results.append({
            "title":              title,
            "operation_type":     "venta" if c.get("TransactionTypeUID") == 261 else "alquiler",
            "property_type":      prop_type,
            "neighborhood":       neighborhood or None,
            "city":               city or None,
            "department":         department or None,
            "price":              raw_price,
            "currency":           currency,
            "sqm_total":          sqm_total,
            "sqm_built":          sqm_built,
            "bedrooms":           int(bedrooms) if bedrooms else None,
            "bathrooms":          int(bathrooms) if bathrooms else None,
            "garages":            int(garages) if garages else None,
            "year_built":         None,   # not in RE/MAX PY index
            "property_condition": None,   # not structured in index
            "description":        full_desc or None,
            "main_photo":         main_photo,
            "photos":             photos,
            "amenities":          amenities,
            "source_url":         source_url,
            "source_agent_id":    agent_id,
            "source":             "remax",
        })

    return results


def _remax_prop_type(c: dict) -> str:
    tipo = int(c.get("MacroPropertyTypeUID") or c.get("PropertyTypeUID") or 0)
    return {17612: "casa", 17613: "departamento", 17618: "terreno", 17616: "local_comercial"}.get(tipo, "casa")


# ── Century21 helpers ──────────────────────────────────────────────────────────

_C21_BASE = "https://century21.com.py"
_C21_UA   = _REMAX_UA


async def _c21_listing_count(page: Page, profile_url: str) -> int:
    """
    Navigate to a C21 agent profile and return their listing count.
    Property cards contain a[href*="/propiedad/"] links.
    Reads total page count from ul.pagination to handle multi-page agents.
    """
    try:
        await page.goto(profile_url, timeout=25_000, wait_until="networkidle")

        # Count property links on first page
        prop_links = await page.query_selector_all('a[href*="/propiedad/"]')
        per_page = len(prop_links)
        if per_page == 0:
            return 0

        # Find max page number from Bootstrap pagination (ul.pagination li a.page-link)
        page_items = await page.query_selector_all("ul.pagination li.page-item a.page-link")
        max_page = 1
        for item in page_items:
            t = (await item.inner_text()).strip()
            if t.isdigit():
                max_page = max(max_page, int(t))

        return per_page * max_page

    except Exception as e:
        sys.stderr.write(f"[c21-count] {profile_url}: {e}\n")
        return 0


async def search_c21_agents(name: str) -> list[dict]:
    """
    Search Century21 Paraguay's /asesores/ directory by typing the name
    into the search field. The page is JS-rendered so networkidle is required.

    Agent cards use the .datosAsesor class.
    Agent name is in a.link-asesor > span.font-weight-bold.
    Agent URL format: /asesor/{id}_{name-slug}
    """
    results = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        ctx  = await browser.new_context(user_agent=_C21_UA)
        page = await ctx.new_page()
        try:
            await page.goto(f"{_C21_BASE}/asesores/", timeout=30_000, wait_until="networkidle")

            # Type name into the search box and submit.
            # C21 asesores may use a form submission (full navigation) or AJAX — handle both.
            search_input = await page.query_selector('input[name="nombre"]')
            if search_input:
                await search_input.fill(name)
                submit_btn = await page.query_selector(
                    'button[type="submit"], input[type="submit"], '
                    '.btn-buscar, [class*="buscar"]'
                )
                try:
                    async with page.expect_navigation(wait_until="networkidle", timeout=12_000):
                        if submit_btn:
                            await submit_btn.click()
                        else:
                            await page.keyboard.press("Enter")
                except Exception:
                    # No full-page navigation (AJAX search) — wait for DOM update
                    try:
                        await page.wait_for_selector(".datosAsesor", timeout=6_000)
                    except Exception:
                        await page.wait_for_timeout(2_500)

            # Extract .datosAsesor cards
            cards = await page.query_selector_all(".datosAsesor")

            for card in cards:
                link_el = await card.query_selector("a.link-asesor")
                if not link_el:
                    continue

                href = (await link_el.get_attribute("href")) or ""
                profile_url = href if href.startswith("http") else f"{_C21_BASE}{href}"

                # /asesor/{id}_{slug} → extract numeric id
                id_m = re.search(r'/asesor/(\d+)', href)
                agent_id = id_m.group(1) if id_m else ""

                # Name from the bold span inside the link
                name_el = await link_el.query_selector("span.font-weight-bold")
                agent_name = (
                    (await name_el.inner_text()).strip()
                    if name_el
                    else (await link_el.inner_text()).strip()
                )
                # Remove surrounding whitespace and newlines
                agent_name = " ".join(agent_name.split())

                # Photo from the circular image
                photo_el = await card.query_selector("img.img-circulo")
                photo = (await photo_el.get_attribute("src") or "") if photo_el else ""
                if photo and not photo.startswith("http"):
                    photo = f"{_C21_BASE}{photo}"

                # Agency: scan card text for a "CENTURY 21 ..." line
                card_text = (await card.inner_text()).strip()
                agency = "Century21 Paraguay"
                for line in card_text.split("\n"):
                    line = line.strip()
                    if "CENTURY 21" in line.upper() and line != agent_name.upper():
                        agency = line
                        break

                results.append({
                    "source":         "c21",
                    "agent_id":       agent_id,
                    "name":           agent_name,
                    "agency":         agency,
                    "photo":          photo,
                    "profile_url":    profile_url,
                    "listings_count": 0,  # populated below
                })

            # Visit each profile to get listing count (cap at 10)
            for r in results[:10]:
                r["listings_count"] = await _c21_listing_count(page, r["profile_url"])

        except Exception as e:
            sys.stderr.write(f"[c21-agent] {e}\n")
        finally:
            await browser.close()

    return results


def _parse_c21_price(raw: str) -> tuple[float, str]:
    """Parse a C21 price string into (amount, currency). Dots are thousands separators in PY.
    Handles dual-currency cards like 'G 25.000.000 US$ 4.106' — prefers USD in that case."""
    clean = raw.replace(".", "").replace(",", "").strip()
    # If USD marker present, extract the number immediately after it
    usd_m = re.search(r'(?:US\$|USD)\s*(\d+)', clean, re.IGNORECASE)
    if usd_m:
        return (float(usd_m.group(1)), "USD")
    # Guaraníes: G, Gs., ₲
    gs_m = re.search(r'(\d+)', clean)
    return (float(gs_m.group(1)), "GS") if gs_m else (0.0, "USD")


async def import_c21_agent_listings(agent_id: str, profile_url: str) -> list[dict]:
    """Scrape all property listings from a Century21 Paraguay agent profile page."""
    if not profile_url:
        profile_url = f"{_C21_BASE}/asesor/{agent_id}"
    results = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        )
        ctx  = await browser.new_context(user_agent=_C21_UA)
        page = await ctx.new_page()
        try:
            await page.goto(profile_url, timeout=30_000, wait_until="networkidle")

            # C21 property cards use Bootstrap .card with a[href*="/propiedad/"] link
            cards = await page.query_selector_all(".card:has(a[href*='/propiedad/'])")
            if not cards:
                # :has() may not be supported — fall back to filtering all .card elements
                all_cards = await page.query_selector_all(".card")
                for c in all_cards:
                    if await c.query_selector('a[href*="/propiedad/"]'):
                        cards.append(c)

            for card in cards:
                link_el = await card.query_selector('a[href*="/propiedad/"]')
                href    = (await link_el.get_attribute("href") or "") if link_el else ""
                url     = href if href.startswith("http") else f"{_C21_BASE}{href}"

                price_el = await card.query_selector(".card-title.precio, h5.precio, [class*='precio']")
                price    = (await price_el.inner_text()).strip() if price_el else "Consultar"

                # Location info is in .col-8 inside .card-body.
                # Must try explicitly — CSS comma-selector returns first DOM match (.card-body)
                loc_el = await card.query_selector(".card-body .col-8")
                if not loc_el:
                    loc_el = await card.query_selector(".card-body")
                location = (await loc_el.inner_text()).strip() if loc_el else ""

                img_el   = await card.query_selector("img.card-img-top, img")
                photo    = (await img_el.get_attribute("src") or "") if img_el else ""

                # Bedrooms from fa-bed sibling text
                bed_text = await page.evaluate(
                    """(card) => {
                        const icons = card.querySelectorAll('.fa-bed');
                        if (!icons.length) return null;
                        const node = icons[0].previousSibling;
                        return node ? node.textContent.trim() : null;
                    }""",
                    card,
                )
                bedrooms = int(bed_text) if bed_text and bed_text.isdigit() else None

                # m² from fa-home sibling
                m2_text = await page.evaluate(
                    """(card) => {
                        const icons = card.querySelectorAll('.fa-home');
                        if (!icons.length) return null;
                        const node = icons[0].previousSibling;
                        return node ? node.textContent.trim() : null;
                    }""",
                    card,
                )
                metros = int(m2_text.replace(",", "")) if m2_text and re.match(r'^[\d,]+$', m2_text) else None

                # Parse price text → numeric amount + currency
                price_raw = price or "Consultar"
                price_amount, price_currency = _parse_c21_price(price_raw) if price_raw != "Consultar" else (0.0, "USD")

                # Derive city/neighborhood from .col-8 text lines
                loc_lines = [ln.strip() for ln in location.split("\n") if ln.strip()]
                title_text = loc_lines[0] if loc_lines else "Sin título"
                city_text  = loc_lines[1] if len(loc_lines) > 1 else None

                # Infer operation and property type from href slug
                op_type   = "alquiler" if "alquiler" in url.lower() else "venta"
                prop_slug  = re.search(r'/propiedad/\d+_([^-]+)-en-', url)
                prop_type  = prop_slug.group(1) if prop_slug else "casa"
                _C21_TYPE  = {"departamento": "departamento", "terreno": "terreno",
                               "casa": "casa", "local": "local_comercial", "duplex": "duplex"}
                prop_type = _C21_TYPE.get(prop_type, "casa")

                results.append({
                    "title":              title_text,
                    "operation_type":     op_type,
                    "property_type":      prop_type,
                    "neighborhood":       None,
                    "city":               city_text,
                    "department":         loc_lines[2] if len(loc_lines) > 2 else None,
                    "price":              price_amount,
                    "currency":           price_currency,
                    "sqm_total":          float(metros) if metros else None,
                    "sqm_built":          None,
                    "bedrooms":           bedrooms,
                    "bathrooms":          None,
                    "garages":            None,
                    "year_built":         None,
                    "property_condition": None,
                    "description":        None,
                    "main_photo":         photo or None,
                    "photos":             [photo] if photo else [],
                    "amenities":          [],
                    "source_url":         url,
                    "source_agent_id":    agent_id,
                    "source":             "c21",
                })

        except Exception as e:
            sys.stderr.write(f"[c21-import] {e}\n")
        finally:
            await browser.close()

    return results


# ── Runner (stdin → stdout) ────────────────────────────────────────────────────

async def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        sys.stdout.write(json.dumps([]))
        return

    try:
        task = json.loads(raw)
    except json.JSONDecodeError as e:
        sys.stderr.write(f"[agent-scraper] JSON parse error: {e}\n")
        sys.stdout.write(json.dumps([]))
        return

    action  = task.get("action", "search_agent")
    name    = task.get("name", "")
    sources = [s.lower() for s in (task.get("sources") or ["remax", "c21"])]

    if action == "search_agent":
        all_candidates: list[dict] = []

        if "c21" in sources:
            all_candidates.extend(await search_c21_agents(name))
        if "remax" in sources:
            all_candidates.extend(await search_remax_agents(name))

        sys.stdout.write(json.dumps(best_matches(all_candidates, name), ensure_ascii=False))

    elif action == "import_agent":
        source      = task.get("source", "")
        agent_id    = str(task.get("agent_id", ""))
        profile_url = task.get("profile_url", "")

        if source == "remax":
            listings = await import_remax_agent_listings(agent_id, profile_url)
        elif source == "c21":
            listings = await import_c21_agent_listings(agent_id, profile_url)
        else:
            listings = []

        sys.stdout.write(json.dumps(listings, ensure_ascii=False))

    else:
        sys.stderr.write(f"[agent-scraper] Unknown action: {action}\n")
        sys.stdout.write(json.dumps([]))


if __name__ == "__main__":
    asyncio.run(main())
