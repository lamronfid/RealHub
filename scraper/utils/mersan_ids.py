"""
Mersan ID lookup helpers.
Maps our canonical property types / city names / barrio names to the
numeric IDs that Mersan's buscador expects in the URL.

Source: propsearch/cache/mersan_ids.json (extracted from live dropdown HTML).
"""

import json
from pathlib import Path

from .text import normalize as _norm

_CACHE = Path(__file__).parent.parent / "cache" / "mersan_ids.json"
with _CACHE.open(encoding="utf-8") as _f:
    _DATA = json.load(_f)

# Reverse maps: normalised name → ID string
_TIPO_BY_NAME:   dict[str, str] = {v.lower(): k for k, v in _DATA["tipos"].items()}
_CIUDAD_BY_NAME: dict[str, str] = {v.lower(): k for k, v in _DATA["ciudades"].items()}
_BARRIO_BY_NAME: dict[str, str] = {v.lower(): k for k, v in _DATA["barrios"].items()}


# Our canonical tipo names → Mersan tipo ID
_OUR_TIPO_MAP: dict[str, str] = {
    "casa":              "1",
    "departamento":      "3",
    "dúplex":            "5",
    "duplex":            "5",
    "quinta/country":    "9",
    "terreno":           "8",
    "terreno/lote":      "8",
    "estancia/campo":    "8",
    "oficina":           "6",
    "depósito/tinglado": "13",
    "deposito/tinglado": "13",
    "industria":         "13",
    "local comercial":   "7",
    "local_comercial":   "7",
    "alojamiento":       "7",
    "edificio":          "3",
}

# Our canonical city slugs / names → Mersan ciudad ID
_OUR_CIUDAD_MAP: dict[str, str] = {
    "asuncion":                "20",
    "asunción":                "20",
    "luque":                   "4",
    "san-lorenzo":             "5",
    "san lorenzo":             "5",
    "lambare":                 "7",
    "lambaré":                 "7",
    "fernando-de-la-mora":     "11",
    "fernando de la mora":     "11",
    "ciudad-del-este":         "21",
    "ciudad del este":         "21",
    "villa-elisa":             "23",
    "villa elisa":             "23",
    "limpio":                  "25",
    "villeta":                 "28",
}

# Barrio aliases so our barrio names resolve to Mersan's uppercase spellings
_BARRIO_ALIASES: dict[str, str] = {
    "madame lynch":          "madame lynch",
    "mme. lynch":            "madame lynch",
    "mme lynch":             "madame lynch",
    "mcal. lopez":           "mariscal lopez",
    "mariscal lopez":        "mariscal lopez",
    "mariscal lópez":        "mariscal lopez",
    "mburucuya":             "mburucuya",
    "mburucuyá":             "mburucuya",
    "mcal. estigarribia":    "mcal. estigarribia",
    "mariscal estigarribia": "mcal. estigarribia",
    "villa morra":           "villa morra",
    "ycua sati":             "ycua sati",
    "ycuá satí":             "ycua sati",
    "virgen del huerto":     "virgen del huerto",
}


def get_tipo_id(our_tipo: str) -> str | None:
    """Return Mersan's tipo ID for one of our canonical property types, or None."""
    return _OUR_TIPO_MAP.get(_norm(our_tipo))


def get_ciudad_id(city_name: str) -> str | None:
    """Return Mersan's ciudad ID for a city name/slug, or None."""
    key = _norm(city_name)
    return _OUR_CIUDAD_MAP.get(key)


def get_barrio_id(barrio_name: str) -> str | None:
    """Return Mersan's barrio ID for a neighbourhood name, or None.

    Tries exact normalised match, then alias lookup, then substring search.
    Returns the first match only — Mersan's URL accepts a single barrio ID.
    """
    key = _norm(barrio_name)
    # Alias first
    resolved = _BARRIO_ALIASES.get(key, key)
    # Exact match in reverse map
    if resolved in _BARRIO_BY_NAME:
        return _BARRIO_BY_NAME[resolved]
    # Substring: our key contained in a mersan barrio name, or vice-versa
    for name, bid in _BARRIO_BY_NAME.items():
        if resolved in name or name in resolved:
            return bid
    return None
