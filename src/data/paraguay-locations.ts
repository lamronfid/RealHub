export interface LocationData {
  [department: string]: {
    [city: string]: string[];
  };
}

// Asunción barrios come from the live /api/locations endpoint.
// The static list below is used as a fallback and for the ACM form.
// Sorted by C21 listing count (most active barrios first).
export const ASUNCION_BARRIOS = [
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
];

export const PARAGUAY_LOCATIONS: LocationData = {
  Central: {
    Asunción:               ASUNCION_BARRIOS,
    Luque:                  ['Centro', 'Luque Norte', 'San Buenaventura'],
    'Mariano Roque Alonso': ['Centro', 'Zona Norte', 'Zona Sur'],
    'Fernando de la Mora':  ['Centro', 'Zona Norte', 'Zona Sur'],
    Areguá:                 ['Centro', 'Zona Costera'],
    Lambaré:                ['Centro', 'Ycuá Bolaños', 'San José', 'Villa Aurelia'],
    'San Lorenzo':          ['Centro', 'Tablada Nueva', 'Lucerito'],
    Limpio:                 ['Centro', 'Zona Norte'],
    Capiatá:                ['Centro', 'Capiatá Industrial'],
    Ypacaraí:               ['Centro', 'Zona Costera'],
    'Villa Elisa':          ['Centro', 'San Bernardino', 'Guaraní'],
    Itauguá:                ['Centro', 'Zona Industrial'],
    Ñemby:                  ['Centro', 'Ytororó'],
    Villeta:                ['Centro', 'Zona Puerto'],
    Ypané:                  ['Centro', 'Zona Norte'],
  },
  'Alto Paraná': {
    'Ciudad del Este': ['Centro', 'Zona Norte', 'Zona Sur', 'km 4', 'km 6', 'km 8'],
    'Minga Guazú':     ['Centro', 'Zona Industrial'],
    Hernandarias:      ['Centro', 'km 10', 'Zona Rural'],
    'Presidente Franco': ['Centro', 'Dr. Paiva'],
    'Santa Rita':      ['Centro'],
  },
  Itapúa: {
    Encarnación: ['Centro', 'Zona Norte', 'Zona Sur', 'Arambory', 'El Brete', 'Puerto Viejo'],
    Cambyretá:   ['Centro'],
    'San Juan del Paraná': ['Centro'],
    'Capitán Miranda': ['Centro'],
  },
  Cordillera: {
    'San Bernardino': ['Centro', 'Zona Costera', 'San Bernardino Country'],
    Caacupé:          ['Centro', 'San Juan'],
    Tobatí:           ['Centro'],
    Emboscada:        ['Centro'],
  },
  'Presidente Hayes': {
    'Villa Hayes':    ['Centro', 'Zona Norte'],
  },
  Boquerón: {
    Filadelfia:       ['Centro', 'Zona Rural'],
    'Mariscal José Félix Estigarribia': ['Centro'],
  },
  Caaguazú: {
    Caaguazú:         ['Centro'],
    'Coronel Oviedo': ['Centro', 'Zona Norte', 'Zona Sur'],
    'Doctor J. Eulogio Estigarribia': ['Centro'],
  },
  Guairá: {
    Villarrica: ['Centro', 'San Roque', 'Zona Norte'],
  },
  Concepción: {
    Concepción: ['Centro', 'Zona Portuaria', 'Zona Norte'],
  },
  Amambay: {
    'Pedro Juan Caballero': ['Centro', 'Zona Frontera'],
  },
  Misiones: {
    'San Juan Bautista': ['Centro'],
    'Santa Rosa':        ['Centro'],
  },
  Paraguarí: {
    Paraguarí:  ['Centro'],
    Ybycuí:     ['Centro'],
    Carapeguá:  ['Centro'],
  },
  Ñeembucú: {
    Pilar: ['Centro'],
  },
  Canindeyú: {
    'Salto del Guairá': ['Centro'],
  },
};

export const DEPARTMENTS = Object.keys(PARAGUAY_LOCATIONS);

export function getCities(department: string): string[] {
  return Object.keys(PARAGUAY_LOCATIONS[department] ?? {});
}

export function getNeighborhoods(department: string, city: string): string[] {
  return PARAGUAY_LOCATIONS[department]?.[city] ?? [];
}
