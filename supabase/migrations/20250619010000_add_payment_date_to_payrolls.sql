-- Add payment_date column to payrolls table
ALTER TABLE payrolls 
ADD COLUMN payment_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN payrolls.payment_date IS 'Дата выплаты зарплаты (обычно 5-10 число каждого месяца)';

-- Set default value to 5th of the next month
UPDATE payrolls 
SET payment_date = (DATE_TRUNC('month', MAKE_DATE(year, month, 1)) + INTERVAL '1 month - 1 day')::date + 5
WHERE payment_date IS NULL;
