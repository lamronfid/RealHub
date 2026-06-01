import re
import json
import asyncio
from playwright.async_api import async_playwright

# Resource blocking function for speed
async def _block_resources(route):
    if route.request.resource_type in ["image", "stylesheet", "font", "media", "websocket"]:
        await route.abort()
    else:
        await route.continue_()

# Helper to normalize text
def _clean_text(s: str) -> str:
    if not s:
        return ""
    # Clean multiple spaces and strip
    return re.sub(r'\s+', ' ', s).strip()

# Helper to map property type to realhub schema
def _map_property_type(raw_type: str) -> str:
    t = raw_type.lower()
    if "depto" in t or "departamento" in t:
        return "departamento"
    if "casa" in t:
        if "duplex" in t or "dúplex" in t:
            return "duplex"
        return "casa"
    if "terreno" in t or "lote" in t:
        return "terreno"
    if "duplex" in t or "dúplex" in t:
        return "duplex"
    if "oficina" in t:
        return "oficina"
    if "deposito" in t or "depósito" in t or "galpon" in t or "galpón" in t:
        return "deposito"
    if "salon" in t or "salón" in t:
        return "salon_comercial"
    if "cochera" in t or "garaje" in t:
        return "cochera"
    # Default fallback
    return "departamento"

# Helper to map amenities to realhub schema
def _map_amenities(amenities_list: list[str]) -> list[str]:
    mapping = {
        "piscina": "Piscina",
        "pileta": "Piscina",
        "quincho": "Quincho",
        "parrilla": "Quincho",
        "asador": "Quincho",
        "jardín": "Jardín",
        "jardin": "Jardín",
        "patio": "Jardín",
        "seguridad": "Seguridad 24hs",
        "vigilancia": "Seguridad 24hs",
        "portería": "Portería",
        "portero": "Portería",
        "recepción": "Portería",
        "gimnasio": "Gimnasio",
        "gym": "Gimnasio",
        "salón de eventos": "Salón de fiestas",
        "salón de fiestas": "Salón de fiestas",
        "sum": "Salón de fiestas",
        "juegos": "Área de juegos",
        "niños": "Área de juegos",
        "generador": "Generador",
        "cisterna": "Cisterna",
        "tanque": "Cisterna",
        "balcón": "Balcón",
        "balcon": "Balcón",
        "terraza": "Terraza"
    }
    
    result = set()
    for item in amenities_list:
        item_lower = item.lower()
        for kw, mapped in mapping.items():
            if kw in item_lower:
                result.add(mapped)
    return list(result)

# Helper to parse price string
def _parse_price(price_str: str) -> tuple[float | None, str]:
    if not price_str:
        return None, "USD"
    
    # Check currency
    currency = "USD"
    if "gs" in price_str.lower() or "₲" in price_str or "guaran" in price_str.lower():
        currency = "PYG"
        
    # Extract numbers
    cleaned = re.sub(r'[^\d]', '', price_str)
    if not cleaned:
        return None, currency
        
    try:
        val = float(cleaned)
        if currency == "USD" and (price_str.endswith(",00") or price_str.endswith(".00")):
            val = val / 100
        return val, currency
    except Exception:
        return None, currency

async def scrape_single_url(url: str) -> dict:
    """Scrapes a single property detail URL (InfoCasas or Clasipar)."""
    url = url.strip()
    is_infocasas = "infocasas.com.py" in url
    is_clasipar = "clasipar.com.py" in url or "clasipar.paraguay.com" in url
    
    if not is_infocasas and not is_clasipar:
        raise ValueError("Portal no compatible. Solo se admite InfoCasas y Clasipar.")
        
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = await browser.new_context(
            ignore_https_errors=True,
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        await page.route("**/*", _block_resources)
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            html = await page.content()
        finally:
            await browser.close()
            
    if is_infocasas:
        return _parse_infocasas_html(html, url)
    else:
        return _parse_clasipar_html(html, url)

def _parse_infocasas_html(html: str, url: str) -> dict:
    nd_match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not nd_match:
        raise ValueError("No se pudieron extraer los metadatos estructurados de InfoCasas.")
        
    nd = json.loads(nd_match.group(1))
    data = nd.get("props", {}).get("pageProps", {}).get("data", {})
    if not data:
        raise ValueError("Ficha de InfoCasas no contiene datos de propiedad.")
        
    title = _clean_text(data.get("title", "Sin Título"))
    description = _clean_text(data.get("description", ""))
    
    op_name = data.get("operation_type", {}).get("name", "Venta")
    transaction_type = "alquiler" if op_name == "Alquiler" else "compra"
    
    prop_name = data.get("property_type", {}).get("name", "Departamento")
    property_type = _map_property_type(prop_name)
    
    raw_amount = data.get("price", {}).get("amount")
    raw_currency = data.get("price", {}).get("currency", {}).get("name", "U$S")
    currency = "USD" if raw_currency == "U$S" else "PYG"
    
    sale_price = float(raw_amount) if transaction_type == "compra" and raw_amount else None
    rent_price = float(raw_amount) if transaction_type == "alquiler" and raw_amount else None
    
    states = data.get("locations", {}).get("state", [])
    city = _clean_text(states[0].get("name", "Asunción")) if states else "Asunción"
    department = city
    
    neighbourhoods = data.get("locations", {}).get("neighbourhood", [])
    neighborhood = _clean_text(neighbourhoods[0].get("name", "")) if neighbourhoods else ""
    
    bedrooms = data.get("bedrooms")
    bathrooms = data.get("bathrooms")
    garages = data.get("garage")
    
    m2_terrain = data.get("m2Terrain") or data.get("m2")
    m2_built = data.get("m2Built") or data.get("m2")
    
    raw_facilities = [f.get("name") for f in data.get("facilities", []) if f.get("name")]
    amenities = _map_amenities(raw_facilities)
    
    raw_images = [img.get("image") for img in data.get("images", []) if img.get("image")]
    photos = raw_images[:12]
    
    return {
        "title": title,
        "description": description,
        "transaction_type": transaction_type,
        "property_type": property_type,
        "sale_price": sale_price,
        "rent_price": rent_price,
        "currency": currency,
        "department": department,
        "city": city,
        "neighborhood": neighborhood,
        "bedrooms": int(bedrooms) if bedrooms is not None else None,
        "bathrooms": int(bathrooms) if bathrooms is not None else None,
        "garages": int(garages) if garages is not None else 0,
        "m2_terrain": float(m2_terrain) if m2_terrain else None,
        "m2_built": float(m2_built) if m2_built else None,
        "amenities": amenities,
        "photos": photos,
        "original_url": url,
        "source": "InfoCasas"
    }

def _parse_clasipar_html(html: str, url: str) -> dict:
    # Find all JSON-LD script blocks and merge/find the correct one
    ld_blocks = re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL)
    ld_data = {}
    for block in ld_blocks:
        try:
            parsed = json.loads(block, strict=False)
            if isinstance(parsed, dict):
                # We want the block that represents the real estate offer (e.g. type is Apartment, House, etc. or contains property fields)
                if "@type" in parsed and (parsed.get("@type") in ["Apartment", "House"] or "numberOfRooms" in parsed):
                    ld_data = parsed
                    break
                # Fallback to any non-empty dict if we haven't found a better one
                if not ld_data:
                    ld_data = parsed
        except Exception:
            pass
            
    title_raw = ld_data.get("name")
    if not title_raw:
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
        title_raw = title_match.group(1) if title_match else "Sin Título"
        
    title = re.sub(r'\s*#\d+\s*\|\s*Clasipar\.com.*$', '', title_raw).strip()
    title = _clean_text(title)
    
    description = _clean_text(ld_data.get("description", ""))
    if not description:
        meta_desc = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html, re.IGNORECASE)
        description = _clean_text(meta_desc.group(1)) if meta_desc else ""
        
    transaction_type = "compra"
    if any(w in title.lower() or w in description.lower() for w in ["alquilo", "alquiler", "renta"]):
        transaction_type = "alquiler"
        
    prop_type_str = ld_data.get("@type", "Apartment")
    if prop_type_str == "Apartment":
        property_type = "departamento"
    elif prop_type_str == "House":
        property_type = "casa"
    else:
        property_type = _map_property_type(title)
        
    price_match = re.search(r'class="user-price"[^>]*>(.*?)</h3>', html)
    price_str = price_match.group(1) if price_match else ""
    if not price_str:
        price_match = re.search(r'(?:Gs\.|Gs|₲|U\$S|\$)\s*[\d\.,]+', html, re.IGNORECASE)
        price_str = price_match.group(0) if price_match else ""
        
    price_val, currency = _parse_price(price_str)
    
    sale_price = price_val if transaction_type == "compra" else None
    rent_price = price_val if transaction_type == "alquiler" else None
    
    city = "Asunción"
    city_match = re.search(r'<span>Ciudad:</span>\s*<h6>(.*?)</h6>', html, re.IGNORECASE)
    if city_match:
        city = _clean_text(city_match.group(1))
    department = city
    
    neighborhood = ""
    barrio_match = re.search(r'<span>Barrio:</span>\s*<h6>(.*?)</h6>', html, re.IGNORECASE)
    if barrio_match:
        neighborhood = _clean_text(barrio_match.group(1))
        
    # Extract rooms and bathrooms
    bedrooms = ld_data.get("numberOfRooms")
    bathrooms = ld_data.get("numberOfBathroomsTotal")
    
    # Try parsing integers
    try:
        bedrooms = int(bedrooms) if bedrooms is not None else None
    except Exception:
        bedrooms = None
        
    try:
        bathrooms = int(bathrooms) if bathrooms is not None else None
    except Exception:
        bathrooms = None
        
    if bedrooms is None:
        bed_match = re.search(r'(\d+)\s*(?:dormitorio|habitac|dorm|hab)', description, re.IGNORECASE)
        bedrooms = int(bed_match.group(1)) if bed_match else None
        
    if bathrooms is None:
        bath_match = re.search(r'(\d+)\s*(?:baño|bñ)', description, re.IGNORECASE)
        bathrooms = int(bath_match.group(1)) if bath_match else None
        
    garages = None
    garage_match = re.search(r'(\d+)\s*(?:cochera|garaje|estacionamiento)', description, re.IGNORECASE)
    if garage_match:
        garages = int(garage_match.group(1))
    elif "cochera" in description.lower() or "garaje" in description.lower():
        garages = 1
    else:
        garages = 0
        
    m2_built = None
    m2_built_match = re.search(r'(?:superficie|construido|m2|m²)\s*:\s*([\d,\.]+)', description, re.IGNORECASE)
    if m2_built_match:
        try:
            m2_built = float(m2_built_match.group(1).replace(",", "."))
        except Exception:
            pass
            
    m2_terrain = m2_built
    
    amenities = _map_amenities(description.split())
    
    photos = []
    pic_matches = re.findall(r'//clasicdn\.paraguay\.com/pictures/[^\s"\'>]+', html)
    for p in pic_matches:
        abs_p = "https:" + p if p.startswith("//") else p
        if abs_p not in photos:
            photos.append(abs_p)
            
    if not photos:
        ld_photo = ld_data.get("photo")
        if ld_photo:
            photos.append(ld_photo)
            
    return {
        "title": title,
        "description": description,
        "transaction_type": transaction_type,
        "property_type": property_type,
        "sale_price": sale_price,
        "rent_price": rent_price,
        "currency": currency,
        "department": department,
        "city": city,
        "neighborhood": neighborhood,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "garages": garages,
        "m2_terrain": float(m2_terrain) if m2_terrain else None,
        "m2_built": float(m2_built) if m2_built else None,
        "amenities": amenities,
        "photos": photos[:12],
        "original_url": url,
        "source": "Clasipar"
    }
