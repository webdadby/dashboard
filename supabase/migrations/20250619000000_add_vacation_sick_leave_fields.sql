-- Add vacation and sick leave payment fields to payrolls table
ALTER TABLE payrolls 
  ADD COLUMN IF NOT EXISTS vacation_pay_current NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacation_pay_next NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sick_leave_payment NUMERIC(10, 2) DEFAULT 0;

-- Add comments for the new columns
COMMENT ON COLUMN payrolls.vacation_pay_current IS 'Vacation pay for the current month';
COMMENT ON COLUMN payrolls.vacation_pay_next IS 'Vacation pay for the next month';
COMMENT ON COLUMN payrolls.sick_leave_payment IS 'Sick leave payment for the current month';
