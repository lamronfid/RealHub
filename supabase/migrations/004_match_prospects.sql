-- ═══════════════════════════════════════════════════
-- RealHub — Match Prospects for Property Algorithm
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_prospects_for_property(p_property_id UUID)
RETURNS TABLE(prospect_id UUID, prospect_name TEXT, agent_name TEXT, match_score INT) AS $$
  WITH scores AS (
    SELECT
      pr.id as prospect_id,
      pr.full_name as prospect_name,
      ap.full_name as agent_name,
      (
        -- 1. Presupuesto (35 pts)
        CASE 
          WHEN pr.price_max IS NULL THEN 35
          WHEN p.price <= pr.price_max THEN 35 
          WHEN p.price <= (pr.price_max * 1.10) THEN 15 
          ELSE 0 
        END +
        
        -- 2. Ubicación (25 pts)
        CASE 
          WHEN array_length(pr.cities, 1) IS NULL THEN 10
          WHEN p.city = ANY(pr.cities) THEN 25 
          ELSE 0 
        END +
        
        -- 3. Dormitorios (20 pts)
        CASE 
          WHEN pr.rooms_min IS NULL THEN 20
          WHEN p.bedrooms >= pr.rooms_min THEN 20 
          WHEN p.bedrooms = (pr.rooms_min - 1) THEN 10 
          ELSE 0 
        END +
        
        -- 4. Metros y Extras (20 pts)
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
      AND pr.transaction_type = p.transaction_type
      AND pr.agent_id != p.agent_id
  )
  SELECT prospect_id, prospect_name, agent_name, match_score
  FROM scores
  WHERE match_score >= 50
  ORDER BY match_score DESC
  LIMIT 20;
$$ LANGUAGE sql STABLE;
