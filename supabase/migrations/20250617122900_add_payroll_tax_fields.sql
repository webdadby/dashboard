-- Add new columns to payrolls table for employer taxes and additional calculations
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS fszn_tax NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS insurance_tax NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS total_employee_cost NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payable_without_salary NUMERIC(10, 2) DEFAULT 0;

-- Update comment on the table
COMMENT ON TABLE payrolls IS 'Employee payroll records with salary, deductions, taxes and employer costs';

-- Add comments on the new columns
COMMENT ON COLUMN payrolls.fszn_tax IS 'Employer FSZN tax (percentage of total accrued)';
COMMENT ON COLUMN payrolls.insurance_tax IS 'Employer insurance tax (percentage of total accrued)';
COMMENT ON COLUMN payrolls.total_employee_cost IS 'Total employee cost (payable + employer taxes)';
COMMENT ON COLUMN payrolls.payable_without_salary IS 'Amount payable without base salary (bonus + extra pay - deductions)';
