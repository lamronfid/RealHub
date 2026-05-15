-- ═══════════════════════════════════════════════════
-- RealHub — Migración para Soporte de Visitas en Agenda
-- ═══════════════════════════════════════════════════

ALTER TABLE public.follow_ups
ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
ADD COLUMN event_type TEXT DEFAULT 'follow_up'; -- 'follow_up', 'visit', 'meeting'
