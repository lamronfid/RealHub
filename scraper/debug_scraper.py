#!/usr/bin/env python3
"""
Quick CLI for manual scraper testing.
Usage: python3 debug_scraper.py --site=view.com.py --op=venta --tipo=casa --ciudad=asuncion [--barrio="Villa Morra"] [--pages=3]
"""
import argparse
import json
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--site",    required=True)
parser.add_argument("--op",      default="venta")
parser.add_argument("--tipo",    default="")
parser.add_argument("--ciudad",  default="asuncion")
parser.add_argument("--barrio",  default="", help="Comma-separated barrio names")
parser.add_argument("--pages",   type=int, default=5)
parser.add_argument("--m2min",   type=float, default=None, help="m² construido min")
parser.add_argument("--m2max",   type=float, default=None, help="m² construido max")
args = parser.parse_args()

barrios = [b.strip() for b in args.barrio.split(",") if b.strip()]

params = {
    "sources":   [args.site],
    "operation": "Alquiler" if args.op == "alquiler" else "Venta",
    "propType":  args.tipo,
    "location":  args.ciudad,
    "barrios":   barrios,
    "bedrooms":  None,
    "resultsPerSite": 50,
}
if args.m2min is not None:
    params["m2ConstruidoMin"] = args.m2min
if args.m2max is not None:
    params["m2ConstruidoMax"] = args.m2max

sys.stderr.write(f"Params: {json.dumps(params, ensure_ascii=False)}\n")
sys.stderr.write("-" * 60 + "\n")

from scraper import search_properties

results = search_properties(params)

sys.stderr.write("-" * 60 + "\n")
sys.stderr.write(f"Total results: {len(results)}\n\n")

for i, r in enumerate(results, 1):
    sys.stderr.write(
        f"[{i:03d}] {r['title'][:70]}\n"
        f"       {r['price']}  |  {r['location']}  |  {r.get('bedrooms','?')} dorm  |  {r.get('metros','?')} m²\n"
        f"       {r['url']}\n\n"
    )
