"""
Diagnostic audit runner.  Runs 7 sites × 3 test cases; emits a JSON summary.
Usage:  python3 _audit_runner.py 2>_audit_runner.log
"""
import json, re, subprocess, sys

TESTS = [
    {"label": "T1", "op": "venta",    "tipo": "casa",         "ciudad": "asuncion", "barrio": ""},
    {"label": "T2", "op": "venta",    "tipo": "terreno",      "ciudad": "asuncion", "barrio": ""},
    {"label": "T3", "op": "alquiler", "tipo": "departamento", "ciudad": "asuncion", "barrio": "Villa Morra"},
]

SITES = [
    "infocasas.com.py",
    "brokers.com.py",
    "century21.com.py",
    "remax.com.py",
    "view.com.py",
    "asuncion.estate",
    "mersan.com.py",
]

TIPO_KEYWORDS = {
    "casa":         ("casa", "chalet", "bungalow", "residencia", "vivienda", "townhouse"),
    "terreno":      ("terreno", "lote", "parcela", "solar", "baldio", "predio", "fraccion"),
    "departamento": ("departamento", "depto", "dpto", "apartamento", "apto", "piso",
                     "monoambiente", "studio", "flat", "loft", "suite"),
}

CITY_VARIANTS = {
    "asuncion": ("asuncion", "asunción", "asuncion d.c.", "asuncion d.c", "asuncion dc"),
}


def matches_tipo(title: str, tipo: str) -> bool:
    kws = TIPO_KEYWORDS.get(tipo, ())
    t = title.lower()
    # Remove accents for comparison
    import unicodedata
    t = "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")
    return any(k in t for k in kws)


def matches_city(location: str, city: str) -> bool:
    import unicodedata
    loc = "".join(c for c in unicodedata.normalize("NFD", location.lower()) if unicodedata.category(c) != "Mn")
    for v in CITY_VARIANTS.get(city, (city,)):
        if v in loc:
            return True
    return False


def run_test(site: str, test: dict) -> dict:
    cmd = [
        "python3", "debug_scraper.py",
        f"--site={site}",
        f"--op={test['op']}",
        f"--tipo={test['tipo']}",
        f"--ciudad={test['ciudad']}",
    ]
    if test["barrio"]:
        cmd.append(f"--barrio={test['barrio']}")

    sys.stderr.write(f"  running {site} {test['label']}...\n")
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300,
            cwd="/Users/jony/propsearch"
        )
        output = proc.stderr  # debug_scraper.py writes everything to stderr
    except subprocess.TimeoutExpired:
        return {"site": site, "test": test["label"], "error": "TIMEOUT", "results": []}
    except Exception as e:
        return {"site": site, "test": test["label"], "error": str(e), "results": []}

    # Parse summary line
    summary_m = re.search(
        r'\[' + re.escape(site) + r'\]\s+limit=(\d+)\s*\|\s*pages=(\d+)\s*\|\s*raw=(\d+)\s*\|\s*matched=(\d+)\s*\|\s*returned=(\d+)',
        output
    )
    if summary_m:
        limit, pages, raw, matched, returned = [int(x) for x in summary_m.groups()]
    else:
        limit = pages = raw = matched = returned = 0

    # Parse individual listing blocks
    # Format: [NNN] title\n       price | location | N dorm | M m²\n       url
    results = []
    blocks = re.findall(
        r'\[(\d{3})\] (.+?)\n\s+(.+?)\s*\|\s*(.+?)\s*\|\s*([\d?None]+) dorm\s*\|\s*([\d?.None]+) m²\n\s+(https?://\S+)',
        output
    )
    for b in blocks:
        num, title, price, location, bedrooms, metros, url = b
        results.append({
            "title":    title.strip(),
            "price":    price.strip(),
            "location": location.strip(),
            "bedrooms": None if bedrooms in ("None", "?") else bedrooms,
            "metros":   None if metros  in ("None", "?") else metros,
            "url":      url.strip(),
        })

    # Analyze each result
    n = len(results)
    wrong_tipo  = sum(1 for r in results if not matches_tipo(r["title"], test["tipo"]))
    wrong_city  = sum(1 for r in results if not matches_city(r["location"], test["ciudad"]))
    null_beds   = sum(1 for r in results if r["bedrooms"] is None)
    null_m2     = sum(1 for r in results if r["metros"]   is None)
    null_price  = sum(1 for r in results if not r["price"] or r["price"].lower() in ("consultar", ""))
    wrong_op    = 0  # We check via dual-op skip log lines
    dual_op_skipped = output.count("[skip-dual-op]")
    tipo_skipped    = output.count("[skip-tipo]")
    barrio_skipped  = output.count("[skip-barrio]")

    # site-error or 0 results with no logged reason
    site_error  = "[site error:" in output or "⚠️" in output
    silent_fail = (returned == 0 and not site_error and "0 results" not in output)

    return {
        "site":    site,
        "test":    test["label"],
        "limit":   limit,
        "pages":   pages,
        "raw":     raw,
        "matched": matched,
        "returned": returned,
        "n_parsed": n,
        "wrong_tipo":  wrong_tipo,
        "wrong_city":  wrong_city,
        "null_beds":   null_beds,
        "null_m2":     null_m2,
        "null_price":  null_price,
        "dual_op_skipped": dual_op_skipped,
        "tipo_skipped":    tipo_skipped,
        "barrio_skipped":  barrio_skipped,
        "site_error":  site_error,
        "silent_fail": silent_fail,
        "raw_output":  output,
    }


all_results = []
for site in SITES:
    for test in TESTS:
        r = run_test(site, test)
        all_results.append(r)
        sys.stderr.write(
            f"    → returned={r.get('returned','?')} wrong_tipo={r.get('wrong_tipo','?')} "
            f"wrong_city={r.get('wrong_city','?')} null_beds={r.get('null_beds','?')} "
            f"null_m2={r.get('null_m2','?')}\n"
        )

# Save full output for manual inspection
with open("/tmp/_audit_results.json", "w") as f:
    json.dump(all_results, f, indent=2)

print(json.dumps(all_results, indent=2))
sys.stderr.write("\nSaved to /tmp/_audit_results.json\n")
