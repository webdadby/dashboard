-- Add tax_identifier column to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS tax_identifier TEXT;

-- Add a comment to the column
COMMENT ON COLUMN public.employees.tax_identifier IS 'Tax identification number (ИНН) for the employee';
