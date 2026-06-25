-- Update notification triggers to use "Búsqueda" terminology and custom formatting
-- for matches on newly added properties or searches.

CREATE OR REPLACE FUNCTION notify_on_property_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility = 'marketplace' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      pr.agent_id,
      'match',
      '¡Match de Búsqueda Encontrado! 🔍',
      'Encontramos un match para la búsqueda de: ' || 
        COALESCE(
          (SELECT string_agg(INITCAP(t), ', ') FROM unnest(pr.property_types) t), 
          'Propiedad'
        ) || 
        CASE WHEN pr.rooms_min IS NOT NULL THEN ' de ' || pr.rooms_min || ' dormitorios' ELSE '' END ||
        CASE WHEN pr.bathrooms_min IS NOT NULL THEN ', ' || pr.bathrooms_min || ' baños' ELSE '' END ||
        ' que hiciste ' || 
        CASE 
          WHEN pr.created_at >= now() - interval '1 day' THEN 'hoy'
          WHEN pr.created_at >= now() - interval '2 days' THEN 'ayer'
          ELSE 'hace ' || EXTRACT(DAY FROM (now() - pr.created_at))::INT || ' días'
        END || '.',
      '/prospectos/' || pr.id || '/matches'
    FROM match_prospects_for_property(NEW.id) m
    JOIN public.prospects pr ON pr.id = m.prospect_id
    WHERE m.match_score >= 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION notify_on_prospect_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage NOT IN ('cerrado', 'perdido') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      p.agent_id,
      'match',
      '¡Nueva Búsqueda Coincidente! 🔍',
      'Una búsqueda coincidente hace match (' || m.match_score || '%) con tu propiedad "' || p.title || '".',
      '/propiedades/' || p.id || '/matches'
    FROM match_properties_for_prospect(NEW.id) m
    JOIN public.properties p ON p.id = m.property_id
    WHERE m.match_score >= 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
