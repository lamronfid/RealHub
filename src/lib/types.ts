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
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  casa: 'Casa', departamento: 'Departamento', terreno: 'Terreno',
  duplex: 'Dúplex', triplex: 'Tríplex', pozo: 'Pozo',
  oficina: 'Oficina', deposito: 'Depósito',
  inmueble_productivo: 'Inmueble Productivo', casa_duplex: 'Casa Dúplex',
  local_comercial: 'Local Comercial',
};

export const DETAILED_PROPERTY_TYPES: PropertyType[] = [
  'casa', 'departamento', 'duplex', 'triplex', 'pozo', 'casa_duplex',
];
export const LAND_ONLY_TYPES: PropertyType[] = ['terreno'];
export const COMMERCIAL_TYPES: PropertyType[] = ['oficina', 'deposito', 'inmueble_productivo', 'local_comercial'];

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
  { label: 'Prospectos', href: '/prospectos', icon: 'people' },
  { label: 'Marketplace', href: '/marketplace', icon: 'storefront' },
  { label: 'Agenda', href: '/agenda', icon: 'calendar_month' },
  { label: 'Mi Perfil', href: '/perfil', icon: 'person' },
];

// ─── Paraguay Locations ───
export const DEPARTMENTS = [
  'Asunción', 'Central', 'Alto Paraná', 'Itapúa', 'Caaguazú',
  'San Pedro', 'Paraguarí', 'Cordillera', 'Guairá', 'Caazapá',
  'Misiones', 'Ñeembucú', 'Amambay', 'Canindeyú', 'Presidente Hayes',
  'Boquerón', 'Alto Paraguay', 'Concepción', 'Otro',
] as const;

export const CITIES: Record<string, string[]> = {
  'Asunción': ['Asunción'],
  'Central': ['Luque', 'San Lorenzo', 'Lambaré', 'Fernando de la Mora', 'Capiatá', 'Mariano Roque Alonso', 'Ñemby', 'Limpio', 'San Antonio', 'Villa Elisa', 'Itauguá', 'Areguá', 'Ypacaraí'],
  'Alto Paraná': ['Ciudad del Este', 'Hernandarias', 'Presidente Franco', 'Minga Guazú', 'Santa Rita', 'Otro'],
  'Itapúa': ['Encarnación', 'Hohenau', 'Obligado', 'Capitán Miranda', 'San Juan del Paraná', 'Otro'],
  'Caaguazú': ['Coronel Oviedo', 'Caaguazú', 'J. Eulogio Estigarribia', 'Repatriación', 'San José de los Arroyos', 'Otro'],
  'San Pedro': ['San Pedro de Ycuamandiyú', 'San Estanislao', 'Santa Rosa del Aguaray', 'Choré', 'Capiibary', 'Otro'],
  'Paraguarí': ['Paraguarí', 'Carapeguá', 'Yaguarón', 'Ybycuí', 'Quiindy', 'Otro'],
  'Cordillera': ['Caacupé', 'San Bernardino', 'Altos', 'Tobatí', 'Eusebio Ayala', 'Otro'],
  'Guairá': ['Villarrica', 'Independencia', 'Mbocayaty', 'Yataity', 'Mauricio José Troche', 'Otro'],
  'Caazapá': ['Caazapá', 'San Juan Nepomuceno', 'Yuty', 'Abaí', 'Buena Vista', 'Otro'],
  'Misiones': ['San Juan Bautista', 'San Ignacio', 'Ayolas', 'Santa Rosa', 'Santiago', 'Otro'],
  'Ñeembucú': ['Pilar', 'Alberdi', 'Cerrito', 'General Díaz', 'Paso de Patria', 'Otro'],
  'Amambay': ['Pedro Juan Caballero', 'Capitán Bado', 'Bella Vista Norte', 'Zanja Pytã', 'Karapaí', 'Otro'],
  'Canindeyú': ['Salto del Guairá', 'Curuguaty', 'Katueté', 'La Paloma', 'Yasy Cañy', 'Otro'],
  'Presidente Hayes': ['Villa Hayes', 'Benjamín Aceval', 'Pozo Colorado', 'Puerto Pinasco', 'Nanawa', 'Otro'],
  'Boquerón': ['Filadelfia', 'Loma Plata', 'Mariscal Estigarribia', 'Neuland', 'Villa Choferes', 'Otro'],
  'Alto Paraguay': ['Fuerte Olimpo', 'Carmelo Peralta', 'Puerto Casado', 'Bahía Negra', 'Puerto Guaraní', 'Otro'],
  'Concepción': ['Concepción', 'Horqueta', 'Yby Yaú', 'Loreto', 'Belén', 'Otro'],
  'Otro': ['Otro'],
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
  'Generador', 'Cisterna', 'Cancha deportiva', 'Lavadero', 'Ascensor', 'Balcón', 'Terraza',
] as const;
