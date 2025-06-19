-- Add termination_date column to employees table
ALTER TABLE employees 
ADD COLUMN termination_date DATE;

-- Update RLS policies if needed
-- (Assuming you have RLS enabled for the employees table)
-- This allows users to see all employees but only update their own records
-- Adjust according to your security requirements
DROP POLICY IF EXISTS "Users can view all employees" ON employees;
CREATE POLICY "Users can view all employees" 
ON employees 
FOR SELECT 
USING (true);

-- Update the insert/update policies to include the new field
-- (Add these if you have RLS policies for insert/update)
-- DROP POLICY IF EXISTS "Users can insert employees" ON employees;
-- CREATE POLICY "Users can insert employees" 
-- ON employees 
-- FOR INSERT 
-- WITH CHECK (true);

-- DROP POLICY IF EXISTS "Users can update employees" ON employees;
-- CREATE POLICY "Users can update employees" 
-- ON employees 
-- FOR UPDATE 
-- USING (true);
