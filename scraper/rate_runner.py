#!/usr/bin/env python3
"""
CLI entry point for the exchange rate.
Writes JSON result to stdout; all logs go to stderr.
"""
import sys
import json

_real_stdout = sys.stdout
sys.stdout = sys.stderr  # suppress any import-time prints

from utils.currency import get_usd_to_pyg_rate

sys.stdout = _real_stdout

rate, is_cached, cached_at = get_usd_to_pyg_rate()
sys.stdout.write(json.dumps({"rate": rate, "is_cached": is_cached, "cached_at": cached_at}, ensure_ascii=False))
sys.stdout.flush()
