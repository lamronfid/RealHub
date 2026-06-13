/**
 * Reference price per square meter (USD/m²) for properties (apartments/houses)
 * in various key neighborhoods in Paraguay (mainly Asunción & Central).
 * Reference Year: 2026.
 */
export const NEIGHBORHOOD_REF_PRICES: Record<string, number> = {
  // Asunción Premium & Corporativo
  'villamorra': 2200,
  'villa morra': 2200,
  'manora': 2100,
  'manorá': 2100,
  'laslomas': 2050,
  'las lomas': 2050,
  'carmelitas': 2000,
  'lascarmelitas': 2000,
  'las carmelitas': 2000,
  'mburucuya': 1950,
  'mburucuyá': 1950,
  'ycuasati': 1500,
  'ycuá satí': 1500,
  'sanjorge': 1550,
  'san jorge': 1550,
  'loslaureles': 1450,
  'los laureles': 1450,

  // Asunción Residencial / Consolidado
  'lasmercedes': 1600,
  'las mercedes': 1600,
  'recoleta': 1400,
  'herrera': 1350,
  'trinidad': 1200,
  'jara': 1150,
  'centro': 1100,
  'sanvicente': 1000,
  'san vicente': 1000,
  'nazareth': 1050,
  'sanpablo': 950,
  'san pablo': 950,
  'barrioobrero': 950,
  'barrio obrero': 950,
  'sajonia': 900,
  'lomapyta': 850,
  'loma pytã': 850,
  'zeballoscue': 750,
  'zeballos cué': 750,

  // Greater Asunción (Central / Lambaré / Luque)
  'yachtygolfclub': 2400,
  'yacht y golf club': 2400,
  'lambarecentro': 950,
  'lambaré centro': 950,
  'luquecentro': 850,
  'luque centro': 850,
  'rakiura': 1600,
  'fernandodelamorazonanorte': 950,
  'fernando de la mora zona norte': 950,
  'fernandodelamorazonasur': 850,
  'fernando de la mora zona sur': 850,
  'sanlorenzocentro': 800,
  'san lorenzo centro': 800,
  'marianoroquealonso': 800,
  'mariano roque alonso': 800,
  'sanbernardino': 1300,
  'san bernardino': 1300,
};

function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // remove non-alphanumeric
}

export function getRefPricePerSqm(neighborhood?: string, city?: string): number | null {
  if (neighborhood) {
    const key = normalizeName(neighborhood);
    if (NEIGHBORHOOD_REF_PRICES[key] !== undefined) {
      return NEIGHBORHOOD_REF_PRICES[key];
    }
  }

  if (city) {
    const key = normalizeName(city);
    if (NEIGHBORHOOD_REF_PRICES[key] !== undefined) {
      return NEIGHBORHOOD_REF_PRICES[key];
    }
  }

  return null;
}
