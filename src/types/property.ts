// AgentProperty — mirrors the agent_properties Supabase table.
// agent_id is a plain string until RealHub auth is wired (then it becomes auth.uid()).

export type PropertyOperationType = 'venta' | 'alquiler';
export type PropertyType = 'casa' | 'departamento' | 'duplex' | 'terreno' | 'local_comercial';
export type PropertyCondition = 'en_pozo' | 'en_construccion' | 'terminado' | 'usado';
export type PropertyCurrency = 'USD' | 'GS';
export type PropertyVisibility = 'private' | 'marketplace';
export type PropertySource = 'manual' | 'remax_import' | 'century21_import';

export interface AgentProperty {
  id: string;
  agentId: string;
  title: string;
  operationType: PropertyOperationType;
  propertyType: PropertyType;
  neighborhood?: string;
  city: string;
  department?: string;
  price: number;
  currency: PropertyCurrency;
  sqmTotal?: number;
  sqmBuilt?: number;
  bedrooms?: number;
  garages?: number;
  yearBuilt?: number;
  propertyCondition?: PropertyCondition;
  amenities: string[];
  description?: string;
  mainPhoto?: string;
  photos: string[];
  visibility: PropertyVisibility;
  source: PropertySource;
  sourceUrl?: string;
  sourceAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentPropertyCreate = Omit<AgentProperty, 'id' | 'agentId' | 'createdAt' | 'updatedAt'>;

// Row shape returned by Supabase (snake_case)
export interface AgentPropertyRow {
  id: string;
  agent_id: string;
  title: string;
  operation_type: string;
  property_type: string;
  neighborhood: string | null;
  city: string;
  department: string | null;
  price: number;
  currency: string;
  sqm_total: number | null;
  sqm_built: number | null;
  bedrooms: number | null;
  garages: number | null;
  year_built: number | null;
  property_condition: string | null;
  amenities: string[];
  description: string | null;
  main_photo: string | null;
  photos: string[];
  visibility: string;
  source: string;
  source_url: string | null;
  source_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToAgentProperty(r: AgentPropertyRow): AgentProperty {
  return {
    id:                r.id,
    agentId:           r.agent_id,
    title:             r.title,
    operationType:     r.operation_type as PropertyOperationType,
    propertyType:      r.property_type as PropertyType,
    neighborhood:      r.neighborhood ?? undefined,
    city:              r.city,
    department:        r.department ?? undefined,
    price:             r.price,
    currency:          r.currency as PropertyCurrency,
    sqmTotal:          r.sqm_total ?? undefined,
    sqmBuilt:          r.sqm_built ?? undefined,
    bedrooms:          r.bedrooms ?? undefined,
    garages:           r.garages ?? undefined,
    yearBuilt:         r.year_built ?? undefined,
    propertyCondition: r.property_condition as PropertyCondition | undefined,
    amenities:         r.amenities,
    description:       r.description ?? undefined,
    mainPhoto:         r.main_photo ?? undefined,
    photos:            r.photos,
    visibility:        r.visibility as PropertyVisibility,
    source:            r.source as PropertySource,
    sourceUrl:         r.source_url ?? undefined,
    sourceAgentId:     r.source_agent_id ?? undefined,
    createdAt:         r.created_at,
    updatedAt:         r.updated_at,
  };
}
