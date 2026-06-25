// ═══════════════════════════════════════════════════
// RealHub — TypeScript types and constants
// ═══════════════════════════════════════════════════

// ─── Pipeline Stages ───
export const PIPELINE_STAGES = [
  'nuevo_contacto',
  'propuestas_enviadas',
  'visita_agendada',
  'negociacion',
  'tramites',
  'cerrado',
  'perdido',
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  nuevo_contacto: 'Nuevo Contacto',
  propuestas_enviadas: 'Propuestas Enviadas',
  visita_agendada: 'Visita Agendada',
  negociacion: 'Negociación',
  tramites: 'Trámites',
  cerrado: 'Cerrado',
  perdido: 'Perdido',
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  nuevo_contacto: '#6366f1',
  propuestas_enviadas: '#3b82f6',
  visita_agendada: '#8b5cf6',
  negociacion: '#f59e0b',
  tramites: '#06b6d4',
  cerrado: '#10b981',
  perdido: '#ef4444',
};

// ─── Property Types ───
export const PROPERTY_TYPES = [
  'casa', 'departamento', 'terreno', 'duplex', 'triplex',
  'pozo', 'oficina', 'deposito', 'inmueble_productivo', 'casa_duplex', 'local_comercial',
  'tinglado', 'cochera', 'salon_comercial', 'lote'
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  casa: 'Casa', departamento: 'Departamento', terreno: 'Terreno',
  duplex: 'Dúplex', triplex: 'Tríplex', pozo: 'Pozo',
  oficina: 'Oficina', deposito: 'Depósito',
  inmueble_productivo: 'Inmueble Productivo', casa_duplex: 'Casa Dúplex',
  local_comercial: 'Local Comercial',
  tinglado: 'Tinglado / Galpón',
  cochera: 'Cochera / Garaje',
  salon_comercial: 'Salón Comercial',
  lote: 'Lote / Fraccionamiento'
};

export const DETAILED_PROPERTY_TYPES: PropertyType[] = [
  'casa', 'departamento', 'duplex', 'triplex', 'pozo', 'casa_duplex',
];
export const LAND_ONLY_TYPES: PropertyType[] = ['terreno', 'lote'];
export const COMMERCIAL_TYPES: PropertyType[] = ['oficina', 'deposito', 'inmueble_productivo', 'local_comercial', 'tinglado', 'salon_comercial', 'cochera'];

export const TRANSACTION_TYPES = ['compra', 'alquiler', 'ambos'] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];

export const CURRENCIES = ['USD', 'PYG'] as const;
export type Currency = typeof CURRENCIES[number];

// ─── Property Detail Options ───
export const CONSTRUCTION_TYPES = ['Antiguo', 'Medio', 'Semi-nuevo', 'Nuevo', 'Lujo'] as const;
export const CONSERVATION_STATES = ['Malo', 'Regular', 'Bueno', 'Excelente', 'Lujo'] as const;
export const LOT_SHAPES = ['Regular', 'Irregular', 'Esquina'] as const;
export const TOPOGRAPHY_TYPES = ['Plano', 'Pendiente leve', 'Pronunciada'] as const;
export const ACCESS_TYPES = ['Pavimentado', 'Empedrado', 'Tierra'] as const;
export const SERVICES = ['Todos', 'Parciales', 'Sin servicios'] as const;
export const ZONING_TYPES = ['Residencial', 'Comercial', 'Mixto', 'Industrial'] as const;
export const FLOOR_LOCATIONS = ['Planta baja', 'Piso 1', 'Piso 2+', 'Subsuelo'] as const;

// ─── Database Row Types ───
export interface AgentProfile {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  agency_name: string | null;
  license_number: string | null;
  bio: string | null;
  specialties: string[];
  coverage_areas: string[];
  role: string;
  onboarding_completed: boolean;
  company_name: string | null;
  experience_years: number | null;
  created_at: string;
  updated_at: string;
  subscription_tier?: string;
  is_verified?: boolean;
  scraper_searches_used?: number;
}

export interface FeatureRequest {
  id: string;
  user_id: string;
  description: string;
  status: string;
  created_at: string;
}

export interface Property {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  transaction_type: string;
  property_type: string;
  sale_price: number | null;
  rent_price: number | null;
  currency: string;
  department: string | null;
  city: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  m2_terrain: number | null;
  m2_built: number | null;
  amenities: string[];
  furnished: string | null;
  exclusive: boolean;
  photos: string[];
  visibility: string;
  marketplace_shared_at: string | null;
  status: string;
  construction_type: string | null;
  conservation_state: string | null;
  lot_shape: string | null;
  topography: string | null;
  access_type: string | null;
  services: string | null;
  zoning: string | null;
  floor_number: number | null;
  has_elevator: boolean;
  front_meters: number | null;
  floor_location: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: string;
  agent_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  transaction_type: string;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  departments: string[];
  cities: string[];
  neighborhoods: string[];
  property_types: string[];
  size_min: number | null;
  size_max: number | null;
  rooms_min: number | null;
  rooms_max: number | null;
  bathrooms_min: number | null;
  bathrooms_max: number | null;
  amenities: string[];
  garages_min: number | null;
  furnished_preference: string | null;
  notes: string | null;
  stage: PipelineStage;
  stage_updated_at: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineEvent {
  id: string;
  prospect_id: string;
  from_stage: string | null;
  to_stage: string;
  agent_id: string;
  notes: string | null;
  created_at: string;
}

export interface FollowUp {
  id: string;
  prospect_id: string;
  property_id: string | null;
  agent_id: string;
  scheduled_at: string;
  interval_label: string | null;
  event_type: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export interface MarketplaceInterest {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  property_id: string | null;
  prospect_id: string | null;
  message: string | null;
  commission_split: number | null;
  status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

// ─── Sidebar Navigation ───
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export const AGENT_NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', href: '/', icon: 'home' },
  { label: 'Propiedades', href: '/propiedades', icon: 'domain' },
  { label: 'Búsquedas', href: '/prospectos', icon: 'saved_search' },
  { label: 'Marketplace', href: '/marketplace', icon: 'storefront' },
  { label: 'Scraper', href: '/scraper', icon: 'travel_explore' },
  { label: 'ACM', href: '/acm/nuevo', icon: 'analytics' },
  { label: 'Calculadora', href: '/calculadora', icon: 'calculate' },
  { label: 'Agenda', href: '/agenda', icon: 'calendar_month' },
  { label: 'Mi Perfil', href: '/perfil', icon: 'person' },
];

// ─── Paraguay Locations ───
export const DEPARTMENTS = [
  'Alto Paraguay', 'Alto Paraná', 'Amambay', 'Asunción', 'Boquerón',
  'Caaguazú', 'Caazapá', 'Canindeyú', 'Central', 'Concepción',
  'Cordillera', 'Guairá', 'Itapúa', 'Misiones', 'Ñeembucú',
  'Paraguarí', 'Presidente Hayes', 'San Pedro'
] as const;

export const CITIES: Record<string, string[]> = {
  'Alto Paraguay': ['Bahía Negra', 'Carmelo Peralta', 'Fuerte Olimpo', 'Puerto Casado'],
  'Alto Paraná': ['Ciudad del Este', 'Doctor Juan León Mallorquín', 'Domingo Martínez de Irala', 'Hernandarias', 'Iruña', 'Itakyry', 'Juan Emilio O\'Leary', 'Los Cedrales', 'Mbaracayú', 'Minga Guazú', 'Minga Porã', 'Naranjal', 'Ñacunday', 'Presidente Franco', 'San Alberto', 'San Cristóbal', 'Santa Fe del Paraná', 'Santa Rita', 'Santa Rosa del Monday', 'Tavapy'],
  'Amambay': ['Bella Vista Norte', 'Capitán Bado', 'Cerro Corá', 'Karapaí', 'Pedro Juan Caballero', 'Zanja Pytã'],
  'Asunción': ['Asunción'],
  'Boquerón': ['Boquerón', 'Filadelfia', 'Loma Plata', 'Mariscal Estigarribia'],
  'Caaguazú': ['Caaguazú', 'Carayaó', 'Coronel Oviedo', 'Doctor Cecilio Báez', 'Doctor J. Eulogio Estigarribia', 'Doctor Juan Manuel Frutos', 'José Domingo Ocampos', 'La Pastora', 'Mcal. Francisco S. López', 'Nueva Londres', 'Nueva Toledo', 'R. I. 3 Corrales', 'Repatriación', 'San Joaquín', 'San José de los Arroyos', 'Santa Rosa del Mbutuy', 'Simón Bolívar', 'Tembiaporá', 'Tres de Febrero', 'Vaquería', 'Yhú'],
  'Caazapá': ['Abaí', 'Buena Vista', 'Caazapá', 'Coronel Maciel', 'Doctor Moisés S. Bertoni', 'Fulgencio Yegros', 'General Higinio Morínigo', 'San Juan Nepomuceno', 'Tavai', 'Yuty'],
  'Canindeyú': ['Corpus Christi', 'Curuguaty', 'General Francisco Caballero Álvarez', 'Itanará', 'Katueté', 'La Paloma', 'Maracaná', 'Nueva Esperanza', 'Puerto Adela', 'Salto del Guairá', 'Villa Ygatimí', 'Yasy Cañy', 'Yby Pytá', 'Ybyrarobaná'],
  'Central': ['Areguá', 'Capiatá', 'Fernando de la Mora', 'Guarambaré', 'Itá', 'Itauguá', 'J. Augusto Saldívar', 'Lambaré', 'Limpio', 'Luque', 'Mariano Roque Alonso', 'Nueva Italia', 'Ñemby', 'San Antonio', 'San Lorenzo', 'Villa Elisa', 'Villeta', 'Ypacaraí', 'Ypané'],
  'Concepción': ['Azotey', 'Belén', 'Concepción', 'Horqueta', 'Loreto', 'Paso Barreto', 'San Carlos del Apa', 'San Lázaro', 'Sargento José Félix López', 'Yby Yaú'],
  'Cordillera': ['Altos', 'Arroyos y Esteros', 'Atyrá', 'Caacupé', 'Caraguatay', 'Emboscada', 'Eusebio Ayala', 'Isla Pucú', 'Itacurubí de la Cordillera', 'Juan de Mena', 'Loma Grande', 'Mbocayaty del Yhaguy', 'Nueva Colombia', 'Piribebuy', 'Primero de Marzo', 'San Bernardino', 'San José Obrero', 'Santa Elena', 'Tobatí', 'Valenzuela'],
  'Guairá': ['Borja', 'Capitán Mauricio José Troche', 'Coronel Martínez', 'Doctor Botrell', 'Félix Pérez Cardozo', 'General Eugenio A. Garay', 'Independencia', 'Itapé', 'Iturbe', 'José Fassardi', 'Mbocayaty', 'Natalicio Talavera', 'Ñumí', 'Paso Yobái', 'San Salvador', 'Tebicuary', 'Villarrica', 'Yataity'],
  'Itapúa': ['Alto Verá', 'Bella Vista', 'Cambyretá', 'Capitán Meza', 'Capitán Miranda', 'Carlos Antonio López', 'Carmen del Paraná', 'Coronel Bogado', 'Edelira', 'Encarnación', 'Fram', 'General Artigas', 'General Delgado', 'Hohenau', 'Itapúa Poty', 'Jesús', 'La Paz', 'Leandro Oviedo', 'Mayor Otaño', 'Natalio', 'Nueva Alborada', 'Obligado', 'Pirapó', 'San Cosme y Damián', 'San Juan del Paraná', 'San Pedro del Paraná', 'San Rafael del Paraná', 'Tomás Romero Pereira', 'Trinidad', 'Yatytay'],
  'Misiones': ['Ayolas', 'San Ignacio', 'San Juan Bautista', 'San Miguel', 'San Patricio', 'Santa María', 'Santa Rosa', 'Santiago', 'Villa Florida', 'Yabebyry'],
  'Ñeembucú': ['Alberdi', 'Cerrito', 'Desmochados', 'General Díaz', 'Guazú Cuá', 'Humaitá', 'Isla Umbú', 'Laureles', 'Mayor José J. Martinez', 'Paso de Patria', 'Pilar', 'San Juan Bautista del Ñeembucú', 'Tacuaras', 'Villa Franca', 'Villa Oliva', 'Villalbín'],
  'Paraguarí': ['Acahay', 'Caapucú', 'Carapeguá', 'Escobar', 'General Bernardino Caballero', 'La Colmena', 'Mbuyapey', 'Paraguarí', 'Pirayú', 'Quiindy', 'Quyquyhó', 'San Roque González de Santa Cruz', 'Sapucai', 'Tebicuarymí', 'Yaguarón', 'Ybycuí', 'Ybytymí'],
  'Presidente Hayes': ['Benjamín Aceval', 'Campo Aceval', 'General José María Bruguez', 'Nanawa', 'Nueva Asunción', 'Puerto Pinasco', 'Teniente Irala Fernández', 'Teniente Esteban Martínez', 'Villa Hayes'],
  'San Pedro': ['25 de Diciembre', 'Antequera', 'Capiibary', 'Choré', 'General Elizardo Aquino', 'General Isidoro Resquín', 'Guayaibí', 'Itacurubí del Rosario', 'Liberación', 'Lima', 'Nueva Germania', 'San Estanislao', 'San Pablo', 'San Pedro de Ycuamandiyú', 'San Vicente Pancholo', 'Santa Rosa del Aguaray', 'Tacuatí', 'Unión', 'Villa del Rosario', 'Yataity del Norte', 'Yrybucuá']
};

export const NEIGHBORHOODS: Record<string, string[]> = {
  'Asunción': [
    'Villa Morra', 'Las Lomas', 'Recoleta', 'Carmelitas', 'Manorá', 'Mburucuyá', 
    'Sajonia', 'Jara', 'Herrera', 'Ytay', 'Los Laureles', 'Trinidad', 'Centro', 
    'San Roque', 'Las Mercedes', 'Barrio Obrero', 'San Vicente', 'Zeballos Cué',
    'Loma Pytã', 'Madame Lynch', 'San Jorge', 'Ycuá Satí', 'San Pablo', 'Nazareth',
    'Hipódromo', 'Terminal', 'Republicano', 'Roberto L. Petit', 'Tacumbú', 'Vista Alegre'
  ],
  'Luque': [
    'Luque Centro', 'Rakiura', 'San José', 'Laurelty', 'Mora Cué', 'Zárate Isla', 
    'Isla Bogado', 'Maka\'i', 'Cuarto Barrio', 'Tercer Barrio', 'Primer Barrio'
  ],
  'Lambaré': [
    'Lambaré Centro', 'Yacht y Golf Club', 'Valle Yvate', 'Valle Apu\'a', 'San Isidro',
    'Mbachio', 'Santo Domingo', 'Panambi Reta', 'Kennedy'
  ],
  'San Lorenzo': [
    'San Lorenzo Centro', 'Reducto', 'Barcequillo', 'Capilla del Monte', 'San Felipe',
    'Calle\'i', 'Lote Guazu', 'Tayazuape', 'Lucerito'
  ],
  'Fernando de la Mora': [
    'Zona Norte', 'Zona Sur', 'Pitiantuta', 'Itá Ka\'aguy', 'Tres Bocas'
  ],
  'Mariano Roque Alonso': [
    'MRA Centro', 'Remanso', 'San Blas', 'Defensores del Chaco'
  ]
};

export const AMENITIES = [
  'Piscina', 'Quincho', 'Jardín', 'Seguridad 24hs', 'Portería',
  'Gimnasio', 'Salón de fiestas', 'Área de juegos', 'Estacionamiento visitantes',
  'Generador', 'Cisterna', 'Cancha deportiva', 'Lavadero', 'Balcón', 'Terraza',
] as const;

export type Amenity = typeof AMENITIES[number];

export interface AmenityDef {
  id: Amenity;
  label: string;
  emoji: string;
  validFor?: PropertyType[];
}

export const AMENITY_DATA: AmenityDef[] = [
  { id: 'Piscina', label: 'Piscina', emoji: '🏊‍♂️' },
  { id: 'Quincho', label: 'Quincho / Parrilla', emoji: '🥩' },
  { id: 'Jardín', label: 'Jardín', emoji: '🌳', validFor: ['casa', 'duplex', 'triplex', 'casa_duplex'] },
  { id: 'Seguridad 24hs', label: 'Seguridad 24hs', emoji: '🛡️' },
  { id: 'Portería', label: 'Portería', emoji: '👮', validFor: ['departamento', 'oficina', 'pozo', 'casa_duplex'] },
  { id: 'Gimnasio', label: 'Gimnasio', emoji: '🏋️‍♂️', validFor: ['departamento', 'pozo', 'oficina'] },
  { id: 'Salón de fiestas', label: 'Salón de Eventos', emoji: '🎉', validFor: ['departamento', 'pozo'] },
  { id: 'Área de juegos', label: 'Área de Niños', emoji: '🛝', validFor: ['departamento', 'pozo', 'casa_duplex'] },
  { id: 'Estacionamiento visitantes', label: 'Estac. Visitas', emoji: '🚗' },
  { id: 'Generador', label: 'Generador 100%', emoji: '⚡' },
  { id: 'Cisterna', label: 'Tanque / Cisterna', emoji: '💧' },
  { id: 'Cancha deportiva', label: 'Cancha Dep.', emoji: '⚽' },
  { id: 'Lavadero', label: 'Área de Lavado', emoji: '🧺' },
  { id: 'Balcón', label: 'Balcón', emoji: '🌇', validFor: ['departamento', 'pozo', 'oficina'] },
  { id: 'Terraza', label: 'Terraza', emoji: '🌅' },
];
