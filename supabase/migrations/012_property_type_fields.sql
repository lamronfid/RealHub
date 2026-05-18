-- ═══════════════════════════════════════════════════
-- RealHub — Phase 2 Tier 3: Property-type specific fields
-- ═══════════════════════════════════════════════════

-- New columns for departamento-specific fields
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS floor_number INTEGER,
  ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false;

-- New columns for local comercial
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS front_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS floor_location TEXT;

-- Services and zoning (all types)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS services TEXT,
  ADD COLUMN IF NOT EXISTS zoning TEXT;
