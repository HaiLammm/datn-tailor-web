-- 010_add_material_column_to_garments.sql
-- Story 2.3: Add material column for multi-dimensional product filtering

ALTER TABLE garments ADD COLUMN material VARCHAR(50);

-- Index for filter performance
CREATE INDEX idx_garments_material ON garments (material);

COMMENT ON COLUMN garments.material IS 'Story 2.3: Fabric material type (lua, giam, nhung, voan, satin, cotton, pha)';
