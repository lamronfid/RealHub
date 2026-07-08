import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface BarrioOption {
  name: string;
  slug: string;
  state: string;
  stateSlug: string;
  count: number;
}

// Full Asunción barrio list sourced from century21.com.py autocomplete API.
// Sorted by listing count (descending). Counts approximate; names are canonical.
const ASUNCION_BARRIOS: BarrioOption[] = [
  { name: 'Recoleta',             slug: 'recoleta-asuncion',             state: 'Asunción', stateSlug: 'asuncion', count: 280 },
  { name: 'Villa Morra',          slug: 'villa-morra-asuncion',          state: 'Asunción', stateSlug: 'asuncion', count: 220 },
  { name: 'Las Lomas',            slug: 'las-lomas-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 220 },
  { name: 'Ycuá Satí',           slug: 'ycua-sati-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 165 },
  { name: 'Las Mercedes',         slug: 'las-mercedes-asuncion',         state: 'Asunción', stateSlug: 'asuncion', count: 131 },
  { name: 'Herrera',              slug: 'herrera-asuncion',              state: 'Asunción', stateSlug: 'asuncion', count: 104 },
  { name: 'Mburucuyá',           slug: 'mburucuya-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 94  },
  { name: 'Trinidad',             slug: 'trinidad-asuncion',             state: 'Asunción', stateSlug: 'asuncion', count: 77  },
  { name: 'Loma Pytá',           slug: 'loma-pyta-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 76  },
  { name: 'Barrio Jara',          slug: 'barrio-jara-asuncion',          state: 'Asunción', stateSlug: 'asuncion', count: 64  },
  { name: 'Mcal. López',         slug: 'mcal.-lopez-asuncion',          state: 'Asunción', stateSlug: 'asuncion', count: 55  },
  { name: 'Los Laureles',         slug: 'los-laureles-asuncion',         state: 'Asunción', stateSlug: 'asuncion', count: 49  },
  { name: 'Pettirossi',           slug: 'pettirossi-asuncion',           state: 'Asunción', stateSlug: 'asuncion', count: 48  },
  { name: 'La Encarnación',       slug: 'la-encarnacion-asuncion',       state: 'Asunción', stateSlug: 'asuncion', count: 41  },
  { name: 'San Jorge',            slug: 'san-jorge-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 38  },
  { name: 'San Roque',            slug: 'san-roque-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 33  },
  { name: 'Virgen del Huerto',    slug: 'virgen-del-huerto-asuncion',    state: 'Asunción', stateSlug: 'asuncion', count: 31  },
  { name: 'Villa Aurelia',        slug: 'villa-aurelia-asuncion',        state: 'Asunción', stateSlug: 'asuncion', count: 27  },
  { name: 'Ytay',                 slug: 'ytay-asuncion',                 state: 'Asunción', stateSlug: 'asuncion', count: 26  },
  { name: 'Manorá',              slug: 'manora-asuncion',               state: 'Asunción', stateSlug: 'asuncion', count: 25  },
  { name: 'Mcal. Estigarribia',  slug: 'mcal.-estigarribia-asuncion',   state: 'Asunción', stateSlug: 'asuncion', count: 24  },
  { name: 'Sajonia',              slug: 'sajonia-asuncion',              state: 'Asunción', stateSlug: 'asuncion', count: 22  },
  { name: 'Gral. Diaz',          slug: 'gral.-diaz-asuncion',           state: 'Asunción', stateSlug: 'asuncion', count: 20  },
  { name: 'Ciudad Nueva',         slug: 'ciudad-nueva-asuncion',         state: 'Asunción', stateSlug: 'asuncion', count: 20  },
  { name: 'Mburicaó',            slug: 'mburicao-asuncion',             state: 'Asunción', stateSlug: 'asuncion', count: 19  },
  { name: 'San Vicente',          slug: 'san-vicente-asuncion',          state: 'Asunción', stateSlug: 'asuncion', count: 16  },
  { name: 'Vista Alegre',         slug: 'vista-alegre-asuncion',         state: 'Asunción', stateSlug: 'asuncion', count: 13  },
  { name: 'Bernardino Caballero', slug: 'bernardino-caballero-asuncion', state: 'Asunción', stateSlug: 'asuncion', count: 11  },
  { name: 'Hipódromo',           slug: 'hipodromo-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 9   },
  { name: 'Nazareth',             slug: 'nazareth-asuncion',             state: 'Asunción', stateSlug: 'asuncion', count: 9   },
  { name: 'Bella Vista',          slug: 'bella-vista-asuncion',          state: 'Asunción', stateSlug: 'asuncion', count: 9   },
  { name: 'Las Carmelitas',       slug: 'las-carmelitas-asuncion',       state: 'Asunción', stateSlug: 'asuncion', count: 8   },
  { name: 'Pinozá',              slug: 'pinoza-asuncion',               state: 'Asunción', stateSlug: 'asuncion', count: 8   },
  { name: 'Itá Enramada',        slug: 'ita-enramada-asuncion',         state: 'Asunción', stateSlug: 'asuncion', count: 6   },
  { name: 'Dr. Francia',          slug: 'dr.-francia-asuncion',          state: 'Asunción', stateSlug: 'asuncion', count: 5   },
  { name: 'Tacumbú',             slug: 'tacumbu-asuncion',              state: 'Asunción', stateSlug: 'asuncion', count: 5   },
  { name: 'Republicano',          slug: 'republicano-asuncion',          state: 'Asunción', stateSlug: 'asuncion', count: 3   },
  { name: 'Terminal',             slug: 'terminal-asuncion',             state: 'Asunción', stateSlug: 'asuncion', count: 3   },
  { name: 'Virgen de Fátima',    slug: 'virgen-de-fatima-asuncion',     state: 'Asunción', stateSlug: 'asuncion', count: 2   },
  { name: 'Roberto L. Petit',     slug: 'roberto-l.-petit-asuncion',     state: 'Asunción', stateSlug: 'asuncion', count: 2   },
  { name: 'Tembetary',            slug: 'tembetary-asuncion',            state: 'Asunción', stateSlug: 'asuncion', count: 2   },
  { name: 'Obrero',               slug: 'obrero-asuncion',               state: 'Asunción', stateSlug: 'asuncion', count: 1   },
  { name: 'Sto. Domingo',         slug: 'sto.-domingo-asuncion',         state: 'Asunción', stateSlug: 'asuncion', count: 1   },
  { name: 'Cañada del Ybyray',   slug: 'canada-del-ybyray-asuncion',    state: 'Asunción', stateSlug: 'asuncion', count: 1   },
  { name: 'Zeballos Cué',        slug: 'zeballos-cue-asuncion',         state: 'Asunción', stateSlug: 'asuncion', count: 1   },
];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
  }

  const q    = req.nextUrl.searchParams.get('q')    ?? '';
  const city = req.nextUrl.searchParams.get('city') ?? '';

  // Fast path: return pre-built Asunción list, optionally filtered by query
  if (city === 'Asunción' || city === 'Asuncion') {
    const qLow = q.toLowerCase();
    const results = qLow
      ? ASUNCION_BARRIOS.filter((b) => b.name.toLowerCase().includes(qLow))
      : ASUNCION_BARRIOS;
    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  // Live path: proxy to C21 autocomplete for other cities
  const query = q.trim() || city.trim();
  if (!query) return NextResponse.json([]);

  try {
    const resp = await fetch(
      `https://century21.com.py/search/undefined_undefined/undefined/${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept':     'application/json',
          'Referer':    'https://century21.com.py/busqueda',
        },
      },
    );
    if (!resp.ok) return NextResponse.json([]);

    const data = await resp.json();
    type C21Loc = { estado: string; municipio: string; estadoWebFinal: string; municipioWebFinal: string; cantidad: number };
    const ubicaciones: C21Loc[] = data.ubicaciones ?? [];

    const results: BarrioOption[] = ubicaciones
      .map((u) => ({
        name:      u.municipio,
        slug:      u.municipioWebFinal,
        state:     u.estado,
        stateSlug: u.estadoWebFinal,
        count:     u.cantidad,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
