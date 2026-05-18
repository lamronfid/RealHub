-- ═══════════════════════════════════════════════════
-- RealHub — Phase 2: New Property Detail Columns
-- ═══════════════════════════════════════════════════

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS construction_type TEXT,
  ADD COLUMN IF NOT EXISTS conservation_state TEXT,
  ADD COLUMN IF NOT EXISTS lot_shape TEXT,
  ADD COLUMN IF NOT EXISTS topography TEXT,
  ADD COLUMN IF NOT EXISTS access_type TEXT;
