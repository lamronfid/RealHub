"""
Backend barrio→city mapping, ported directly from data/paraguay-locations.ts.

Why a Python module rather than a shared JSON?  The TS file is the source of
truth; keeping a Python dict here avoids a file-path resolution step at import
time and lets the data be typed and searchable without a JSON loader.  When the
TS file changes, this file must be updated in parallel.

All public helpers are accent-insensitive via normalize() from utils.text.
"""

from utils.text import normalize


# ── Raw data (mirrors data/paraguay-locations.ts exactly) ────────────────────

ASUNCION_BARRIOS: list[str] = [
    'Recoleta',
    'Villa Morra',
    'Las Lomas',
    'Ycuá Satí',
    'Las Mercedes',
    'Herrera',
    'Mburucuyá',
    'Trinidad',
    'Loma Pytá',
    'Barrio Jara',
    'Mcal. López',
    'Los Laureles',
    'Pettirossi',
    'La Encarnación',
    'San Jorge',
    'San Roque',
    'Virgen del Huerto',
    'Villa Aurelia',
    'Ytay',
    'Manorá',
    'Mcal. Estigarribia',
    'Sajonia',
    'Gral. Diaz',
    'Ciudad Nueva',
    'Mburicaó',
    'San Vicente',
    'Vista Alegre',
    'Bernardino Caballero',
    'Hipódromo',
    'Nazareth',
    'Bella Vista',
    'Las Carmelitas',
    'Pinozá',
    'Itá Enramada',
    'Dr. Francia',
    'Tacumbú',
    'Virgen de Fátima',
    'Obrero',
    'Cañada del Ybyray',
    'Zeballos Cué',
]

PARAGUAY_LOCATIONS: dict[str, dict[str, list[str]]] = {
    'Central': {
        'Asunción':               ASUNCION_BARRIOS,
        'Luque':                  ['Centro', 'Luque Norte', 'San Buenaventura'],
        'Mariano Roque Alonso':   ['Centro', 'Zona Norte', 'Zona Sur'],
        'Fernando de la Mora':    ['Centro', 'Zona Norte', 'Zona Sur'],
        'Areguá':                 ['Centro', 'Zona Costera'],
        'Lambaré':                ['Centro', 'Ycuá Bolaños', 'San José', 'Villa Aurelia'],
        'San Lorenzo':            ['Centro', 'Tablada Nueva', 'Lucerito'],
        'Limpio':                 ['Centro', 'Zona Norte'],
        'Capiatá':                ['Centro', 'Capiatá Industrial'],
        'Ypacaraí':               ['Centro', 'Zona Costera'],
        'Villa Elisa':            ['Centro', 'San Bernardino', 'Guaraní'],
        'Itauguá':                ['Centro', 'Zona Industrial'],
        'Ñemby':                  ['Centro', 'Ytororó'],
        'Villeta':                ['Centro', 'Zona Puerto'],
        'Ypané':                  ['Centro', 'Zona Norte'],
    },
    'Alto Paraná': {
        'Ciudad del Este': ['Centro', 'Zona Norte', 'Zona Sur', 'km 4', 'km 6', 'km 8'],
        'Minga Guazú':     ['Centro', 'Zona Industrial'],
        'Hernandarias':    ['Centro', 'km 10', 'Zona Rural'],
        'Presidente Franco': ['Centro', 'Dr. Paiva'],
        'Santa Rita':      ['Centro'],
    },
    'Itapúa': {
        'Encarnación': ['Centro', 'Zona Norte', 'Zona Sur', 'Arambory', 'El Brete', 'Puerto Viejo'],
        'Cambyretá':   ['Centro'],
        'San Juan del Paraná': ['Centro'],
        'Capitán Miranda': ['Centro'],
    },
    'Cordillera': {
        'San Bernardino': ['Centro', 'Zona Costera', 'San Bernardino Country'],
        'Caacupé':        ['Centro', 'San Juan'],
        'Tobatí':         ['Centro'],
        'Emboscada':      ['Centro'],
    },
    'Presidente Hayes': {
        'Villa Hayes':    ['Centro', 'Zona Norte'],
    },
    'Boquerón': {
        'Filadelfia':       ['Centro', 'Zona Rural'],
        'Mariscal José Félix Estigarribia': ['Centro'],
    },
    'Caaguazú': {
        'Caaguazú':         ['Centro'],
        'Coronel Oviedo':   ['Centro', 'Zona Norte', 'Zona Sur'],
        'Doctor J. Eulogio Estigarribia': ['Centro'],
    },
    'Guairá': {
        'Villarrica': ['Centro', 'San Roque', 'Zona Norte'],
    },
    'Concepción': {
        'Concepción': ['Centro', 'Zona Portuaria', 'Zona Norte'],
    },
    'Amambay': {
        'Pedro Juan Caballero': ['Centro', 'Zona Frontera'],
    },
    'Misiones': {
        'San Juan Bautista': ['Centro'],
        'Santa Rosa':        ['Centro'],
    },
    'Paraguarí': {
        'Paraguarí':  ['Centro'],
        'Ybycuí':     ['Centro'],
        'Carapeguá':  ['Centro'],
    },
    'Ñeembucú': {
        'Pilar': ['Centro'],
    },
    'Canindeyú': {
        'Salto del Guairá': ['Centro'],
    },
}


# ── Derived lookup structures (built once at import) ─────────────────────────

# normalised city name → canonical city name (e.g. "asuncion" → "Asunción")
_CITY_NORM_TO_CANONICAL: dict[str, str] = {}

# count of how many cities each normalised barrio name appears in
# (used to filter out ambiguous names like "Centro" or "San Roque")
_barrio_city_count: dict[str, int] = {}

# normalised barrio name → canonical city name (unique barrios only)
_BARRIO_NORM_TO_CITY: dict[str, str] = {}

# canonical city name → list of canonical barrio names
_CITY_TO_BARRIOS: dict[str, list[str]] = {}

for _dept, _cities in PARAGUAY_LOCATIONS.items():
    for _city, _barrios in _cities.items():
        _CITY_NORM_TO_CANONICAL[normalize(_city)] = _city
        _CITY_TO_BARRIOS[_city] = _barrios
        for _barrio in _barrios:
            _bn = normalize(_barrio)
            _barrio_city_count[_bn] = _barrio_city_count.get(_bn, 0) + 1

for _dept, _cities in PARAGUAY_LOCATIONS.items():
    for _city, _barrios in _cities.items():
        for _barrio in _barrios:
            _bn = normalize(_barrio)
            # Only include barrios that are unique to a single city.
            # Generic names ("Centro", "Zona Norte", "San Roque" etc.) that
            # appear in multiple cities are ambiguous and excluded — scanning
            # for them in a location string can't determine the city.
            if _barrio_city_count[_bn] == 1:
                _BARRIO_NORM_TO_CITY[_bn] = _city

# Sorted by descending length so longer names match before shorter substrings.
# E.g. "san bernardino country" matched before "san bernardino" before "san".
_BARRIO_NORMS_SORTED: list[str] = sorted(
    _BARRIO_NORM_TO_CITY.keys(), key=len, reverse=True
)
_CITY_NORMS_SORTED: list[str] = sorted(
    _CITY_NORM_TO_CANONICAL.keys(), key=len, reverse=True
)


# ── Public helpers ────────────────────────────────────────────────────────────

def barrios_of_city(city: str) -> list[str]:
    """Return all barrio names for a city (accent-insensitive). [] if unknown."""
    canonical = _CITY_NORM_TO_CANONICAL.get(normalize(city))
    if not canonical:
        return []
    return list(_CITY_TO_BARRIOS.get(canonical, []))


def city_of_barrio(barrio: str) -> str | None:
    """Return canonical city name for a unique barrio. None if ambiguous or unknown."""
    return _BARRIO_NORM_TO_CITY.get(normalize(barrio))


def scan_city_in_text(text: str) -> str | None:
    """
    Scan text for any known city name (longest match first).
    Returns canonical city name, or None if no city found.
    """
    text_norm = normalize(text)
    for cn in _CITY_NORMS_SORTED:
        if cn in text_norm:
            return _CITY_NORM_TO_CANONICAL[cn]
    return None


def scan_barrio_city_in_text(text: str) -> str | None:
    """
    Scan text for any unique barrio name and return the city it belongs to.
    Returns canonical city name, or None if no unique barrio found.
    """
    text_norm = normalize(text)
    for bn in _BARRIO_NORMS_SORTED:
        if bn in text_norm:
            return _BARRIO_NORM_TO_CITY[bn]
    return None
