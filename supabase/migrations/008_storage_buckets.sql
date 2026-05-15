-- ═══════════════════════════════════════════════════
-- RealHub — Migración para crear Storage Bucket de Propiedades
-- ═══════════════════════════════════════════════════

-- 1. Crear el bucket público "properties"
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de RLS para los objetos (fotos)
-- Permitir lectura a todo el mundo
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'properties');

-- Permitir subida a usuarios autenticados
CREATE POLICY "Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'properties' AND auth.role() = 'authenticated');

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'properties' AND auth.role() = 'authenticated');

-- Permitir eliminación a usuarios autenticados
CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'properties' AND auth.role() = 'authenticated');
