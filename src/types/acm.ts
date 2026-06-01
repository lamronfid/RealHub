export type AcmOperationType = 'venta' | 'alquiler';

export type AcmPropertyType =
  | 'casa'
  | 'departamento'
  | 'duplex'
  | 'terreno'
  | 'local_comercial';

export type AcmPropertyCondition =
  | 'en_pozo'
  | 'en_construccion'
  | 'terminado'
  | 'usado';

// State of conservation (condition of the building)
export type AcmConservacion =
  | 'malo'
  | 'regular'
  | 'bueno'
  | 'excelente'
  | 'lujo';

// Age category of construction
export type AcmTipo =
  | 'antiguo'
  | 'medio'
  | 'seminuevo'
  | 'nuevo'
  | 'lujo';

export type AcmCurrency = 'USD' | 'GS';

export type AcmAmenity =
  | 'piscina'
  | 'quincho'
  | 'gimnasio'
  | 'seguridad_24h'
  | 'ascensor'
  | 'jardin'
  | 'terraza'
  | 'balcon';

export type AcmPricePositioning =
  | 'within_market'
  | 'slightly_above'
  | 'significantly_above'
  | 'below_market';

export interface AcmSubjectProperty {
  operationType: AcmOperationType;
  propertyType: AcmPropertyType;
  propertyCondition: AcmPropertyCondition;
  conservacion?: AcmConservacion;
  tipo?: AcmTipo;
  costPerSqm?: number;
  department: string;
  city: string;
  neighborhood: string;
  priceTarget: number;
  currency: AcmCurrency;
  sqmTotal: number;
  sqmBuilt?: number;
  bedrooms: number;
  bathrooms?: number;
  garages?: number;
  yearBuilt?: number;
  amenities: AcmAmenity[];
  notes?: string;
}

export interface AcmComparable {
  id: string;
  source: string;
  title: string;
  propertyType?: AcmPropertyType;
  price: number;
  currency: AcmCurrency;
  sqm?: number;
  pricePerSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  location: string;
  neighborhood?: string;
  city?: string;
  url: string;
  similarityScore: number;
  photo?: string;
  isInternal: boolean;
  adjustment?: number;
  conservacion?: AcmConservacion;
  tipo?: AcmTipo;
  costPerSqm?: number;
}

export interface AcmFilters {
  sources: string[];
  similarityMin: number;
  priceMin?: number;
  priceMax?: number;
  sqmMin?: number;
  sqmMax?: number;
}

export interface AcmReportData {
  averagePrice: number;
  averagePricePerSqm: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  suggestedPrice: number;
  pricePositioning: AcmPricePositioning;
  conclusion: string;
  estimatedDaysOnMarket: string;
}

export interface AcmReport {
  id?: string;
  agentId: string;
  subjectProperty: AcmSubjectProperty;
  comparables: AcmComparable[];
  reportData: AcmReportData;
  agentNotes: string;
  pdfUrl?: string;
  createdAt?: string;
}

export interface AcmApiResponse {
  comparables: Array<{
    source: string;
    title: string;
    propertyType?: string;
    price: number;
    currency: AcmCurrency;
    sqm?: number;
    pricePerSqm?: number;
    bedrooms?: number;
    bathrooms?: number;
    yearBuilt?: number;
    location: string;
    neighborhood?: string;
    url: string;
    similarityScore: number;
    photo?: string;
  }>;
  totalFound: number;
}
