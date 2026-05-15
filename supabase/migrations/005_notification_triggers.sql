-- ═══════════════════════════════════════════════════
-- RealHub — Notification Triggers for Auto-Matching
-- ═══════════════════════════════════════════════════

-- 1. Trigger when a NEW PROPERTY is added
CREATE OR REPLACE FUNCTION notify_on_property_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility = 'marketplace' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      pr.agent_id,
      'match',
      '¡Nuevo Match Potencial! 🟢',
      'Una nueva propiedad "' || NEW.title || '" hace match (' || m.match_score || '%) con tu prospecto "' || pr.full_name || '".',
      '/prospectos/' || pr.id || '/matches'
    FROM match_prospects_for_property(NEW.id) m
    JOIN public.prospects pr ON pr.id = m.prospect_id
    WHERE m.match_score >= 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_property_insert ON public.properties;
CREATE TRIGGER on_property_insert
AFTER INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION notify_on_property_insert();

-- 2. Trigger when a NEW PROSPECT is added
CREATE OR REPLACE FUNCTION notify_on_prospect_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage NOT IN ('cerrado', 'perdido') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      p.agent_id,
      'match',
      '¡Nuevo Prospecto Interesado! 🟢',
      'Un nuevo prospecto hace match (' || m.match_score || '%) con tu propiedad "' || p.title || '".',
      '/propiedades/' || p.id || '/matches'
    FROM match_properties_for_prospect(NEW.id) m
    JOIN public.properties p ON p.id = m.property_id
    WHERE m.match_score >= 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_prospect_insert ON public.prospects;
CREATE TRIGGER on_prospect_insert
AFTER INSERT ON public.prospects
FOR EACH ROW EXECUTE FUNCTION notify_on_prospect_insert();
