-- ═══════════════════════════════════════════════════
-- RealHub — Avatars Storage Bucket + Neighborhood Matching
-- ═══════════════════════════════════════════════════

-- 1. Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Avatar Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Auth Avatar Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Avatar Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Avatar Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 2. Update matching functions with neighborhood scoring
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
        -- 1. Presupuesto (30 pts)
        CASE 
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 30
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 30
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
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
      AND p.agent_id != pr.agent_id
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
        -- 1. Presupuesto (30 pts)
        CASE
          WHEN pr.price_max IS NULL THEN 30
          WHEN pr.transaction_type = 'compra' THEN
            CASE
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= pr.price_max THEN 30
              WHEN p.sale_price IS NOT NULL AND p.sale_price <= (pr.price_max * 1.10) THEN 15
              ELSE 0
            END
          WHEN pr.transaction_type = 'alquiler' THEN
            CASE
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= pr.price_max THEN 30
              WHEN p.rent_price IS NOT NULL AND p.rent_price <= (pr.price_max * 1.10) THEN 15
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
      AND pr.agent_id != p.agent_id
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;
