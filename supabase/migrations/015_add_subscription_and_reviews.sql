-- ═══════════════════════════════════════════════════
-- RealHub — 015 Subscription, Featured Properties & Agent Reviews
-- ═══════════════════════════════════════════════════

-- 1. Alter agent_profiles to add subscription and verification status
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Alter properties to add featured flags
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- 3. Create agent_reviews table
CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agent_id UUID REFERENCES public.agent_profiles(id) ON DELETE CASCADE NOT NULL,
  to_agent_id UUID REFERENCES public.agent_profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_agent_review UNIQUE(from_agent_id, to_agent_id),
  CONSTRAINT self_review_check CHECK (from_agent_id != to_agent_id)
);

-- Enable RLS for agent_reviews
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for agent_reviews
CREATE POLICY "Anyone can view agent reviews" 
ON public.agent_reviews FOR SELECT 
USING (true);

CREATE POLICY "Agents can insert reviews for other agents" 
ON public.agent_reviews FOR INSERT 
WITH CHECK (auth.uid() = from_agent_id);

CREATE POLICY "Agents can update/delete their own reviews" 
ON public.agent_reviews FOR UPDATE 
USING (auth.uid() = from_agent_id);

CREATE POLICY "Agents can delete their own reviews" 
ON public.agent_reviews FOR DELETE 
USING (auth.uid() = from_agent_id);

-- 4. Recreate matching functions with currency conversion and strict property type matching
-- Prospect → Property matching
CREATE OR REPLACE FUNCTION match_properties_for_prospect(p_prospect_id UUID)
RETURNS TABLE(property_id UUID, property_title TEXT, agent_name TEXT, match_score INT) AS $$
  WITH prospect_data AS (
    SELECT * FROM public.prospects WHERE id = p_prospect_id
  ),
  scores AS (
    SELECT
      p.id as property_id,
      p.title as property_title,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts) con conversión de moneda (1 USD = 7500 PYG)
        CASE 
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              -- Ambas en USD o convertidas a USD
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0 
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts: 10 size + 5 bath + 5 garage)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.properties p
    CROSS JOIN prospect_data pr
    LEFT JOIN public.agent_profiles ap ON ap.id = p.agent_id
    WHERE p.visibility = 'marketplace'
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      -- Filtro estricto por tipo de propiedad
      AND (
        pr.property_types IS NULL 
        OR array_length(pr.property_types, 1) IS NULL 
        OR p.property_type = ANY(pr.property_types)
      )
  )
  SELECT property_id, property_title, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;

-- Property → Prospect matching
CREATE OR REPLACE FUNCTION match_prospects_for_property(p_property_id UUID)
RETURNS TABLE(prospect_id UUID, prospect_name TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      pr.id as prospect_id,
      pr.full_name as prospect_name,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (30 pts) con conversión de moneda (1 USD = 7500 PYG)
        CASE
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.sale_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.sale_price / 7500.0 ELSE p.sale_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   (CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) THEN 30
              WHEN p.rent_price IS NOT NULL AND 
                   (CASE WHEN p.currency = 'PYG' THEN p.rent_price / 7500.0 ELSE p.rent_price END) <= 
                   ((CASE WHEN pr.currency = 'PYG' THEN pr.price_max / 7500.0 ELSE pr.price_max END) * 1.10) THEN 15
              ELSE 0
            END
          ELSE 0
        END +
        
        -- 2. Ubicación (30 pts: 15 city + 15 neighborhood)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL AND array_length(pr.neighborhoods, 1) IS NULL THEN 15
          WHEN p.city = ANY(pr.cities) THEN 15 
          ELSE 0 
        END +
        CASE
          WHEN array_length(pr.neighborhoods, 1) IS NULL THEN 5
          WHEN p.neighborhood = ANY(pr.neighborhoods) THEN 15
          ELSE 0
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Extras (20 pts)
        CASE 
          WHEN pr.size_min IS NULL THEN 10
          WHEN p.m2_built >= pr.size_min THEN 10 
          ELSE 0 
        END +
        CASE 
          WHEN pr.bathrooms_min IS NULL THEN 5
          WHEN p.bathrooms >= pr.bathrooms_min THEN 5 
          ELSE 0 
        END +
        CASE 
          WHEN pr.garages_min IS NULL THEN 5
          WHEN p.garages >= pr.garages_min THEN 5 
          ELSE 0 
        END
      ) as match_score
    FROM public.prospects pr
    JOIN public.properties p ON p.id = p_property_id
    LEFT JOIN public.agent_profiles ap ON ap.id = pr.agent_id
    WHERE pr.stage NOT IN ('cerrado', 'perdido')
      AND (
        (pr.transaction_type = 'compra' AND (p.transaction_type = 'compra' OR p.transaction_type = 'ambos'))
        OR
        (pr.transaction_type = 'alquiler' AND (p.transaction_type = 'alquiler' OR p.transaction_type = 'ambos'))
      )
      -- Filtro estricto por tipo de propiedad
      AND (
        pr.property_types IS NULL 
        OR array_length(pr.property_types, 1) IS NULL 
        OR p.property_type = ANY(pr.property_types)
      )
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;
