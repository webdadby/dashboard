-- Add FSZN and insurance rate fields to the settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS fszn_rate NUMERIC(5, 2) DEFAULT 34.0,
ADD COLUMN IF NOT EXISTS insurance_rate NUMERIC(5, 2) DEFAULT 0.6;

-- Update existing records to have the default values
UPDATE settings
SET fszn_rate = 34.0, insurance_rate = 0.6
WHERE fszn_rate IS NULL OR insurance_rate IS NULL;
