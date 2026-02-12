-- Add early termination and renewal fields to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS terminated_at DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS termination_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS renewal_history JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN inventory.terminated_at IS 'Date the resource was terminated early; NULL if not terminated';
COMMENT ON COLUMN inventory.termination_reason IS 'Optional reason for early termination';
COMMENT ON COLUMN inventory.renewal_history IS 'Array of renewal snapshots: [{renewedAt, dates, financials}]';
