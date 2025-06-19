-- Add salary_payment_date to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS salary_payment_day INTEGER NOT NULL DEFAULT 5;

-- Add comment to explain the column
COMMENT ON COLUMN settings.salary_payment_day IS 'День месяца, когда выплачивается зарплата (по умолчанию 5-е число)';

-- Update existing rows to have the default value if not set
UPDATE settings
SET salary_payment_day = 5
WHERE salary_payment_day IS NULL;
