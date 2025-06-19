-- Create vacation_settings table to store company-wide vacation settings
CREATE TABLE IF NOT EXISTS vacation_settings (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  days_per_year INTEGER NOT NULL DEFAULT 24, -- Standard vacation days per year
  calculation_period_months INTEGER NOT NULL DEFAULT 12, -- Number of months to use for average salary calculation
  coefficient DECIMAL(5,2) NOT NULL DEFAULT 1.00, -- Coefficient for vacation pay calculation
  min_days_per_request INTEGER NOT NULL DEFAULT 7, -- Minimum days per vacation request
  max_consecutive_days INTEGER NOT NULL DEFAULT 28 -- Maximum consecutive vacation days
);

-- Create vacation_balances table to track vacation days balance per employee
CREATE TABLE IF NOT EXISTS vacation_balances (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  days_entitled INTEGER NOT NULL DEFAULT 24, -- Days entitled for the year
  days_used INTEGER NOT NULL DEFAULT 0, -- Days already used
  days_scheduled INTEGER NOT NULL DEFAULT 0, -- Days scheduled but not yet used
  days_remaining INTEGER NOT NULL DEFAULT 24, -- Days remaining (entitled - used - scheduled)
  UNIQUE(employee_id, year)
);

-- Create vacation_requests table to store vacation requests
CREATE TABLE IF NOT EXISTS vacation_requests (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL, -- Number of working days in the vacation period
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  payment_amount DECIMAL(12,2), -- Calculated vacation payment amount
  average_salary DECIMAL(12,2), -- Average salary used for calculation
  calculation_period_start DATE, -- Start of the period used for average salary calculation
  calculation_period_end DATE, -- End of the period used for average salary calculation
  notes TEXT,
  CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  CHECK (end_date >= start_date)
);

-- Create vacation_payments table to track vacation payments
CREATE TABLE IF NOT EXISTS vacation_payments (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vacation_request_id INTEGER NOT NULL REFERENCES vacation_requests(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE
);

-- Insert default vacation settings
INSERT INTO vacation_settings 
  (days_per_year, calculation_period_months, coefficient, min_days_per_request, max_consecutive_days)
VALUES 
  (24, 12, 1.00, 7, 28)
ON CONFLICT DO NOTHING;

-- Create or replace function to update vacation_balances.days_remaining
CREATE OR REPLACE FUNCTION update_vacation_balance_remaining()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vacation_balances
  SET days_remaining = days_entitled - days_used - days_scheduled,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update days_remaining when days_entitled, days_used, or days_scheduled changes
DROP TRIGGER IF EXISTS update_vacation_balance_remaining_trigger ON vacation_balances;
CREATE TRIGGER update_vacation_balance_remaining_trigger
AFTER INSERT OR UPDATE OF days_entitled, days_used, days_scheduled ON vacation_balances
FOR EACH ROW
EXECUTE FUNCTION update_vacation_balance_remaining();

-- Create or replace function to update vacation_balances when a vacation request status changes
CREATE OR REPLACE FUNCTION update_vacation_balance_on_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_balance_id INTEGER;
BEGIN
  -- Get the year from the vacation start date
  v_year := EXTRACT(YEAR FROM NEW.start_date);
  
  -- Find or create the vacation balance record for this employee and year
  SELECT id INTO v_balance_id FROM vacation_balances 
  WHERE employee_id = NEW.employee_id AND year = v_year;
  
  IF v_balance_id IS NULL THEN
    -- Create a new balance record if it doesn't exist
    INSERT INTO vacation_balances (employee_id, year, days_entitled, days_used, days_scheduled)
    VALUES (NEW.employee_id, v_year, 
           (SELECT days_per_year FROM vacation_settings LIMIT 1), 
           0, 0)
    RETURNING id INTO v_balance_id;
  END IF;
  
  -- Update the balance based on the status change
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' THEN
      -- New approved request - add to scheduled
      UPDATE vacation_balances SET days_scheduled = days_scheduled + NEW.days_count WHERE id = v_balance_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'approved' AND NEW.status = 'completed' THEN
      -- Request completed - move from scheduled to used
      UPDATE vacation_balances 
      SET days_scheduled = days_scheduled - NEW.days_count,
          days_used = days_used + NEW.days_count
      WHERE id = v_balance_id;
    ELSIF OLD.status = 'approved' AND NEW.status = 'rejected' THEN
      -- Approved request rejected - remove from scheduled
      UPDATE vacation_balances SET days_scheduled = days_scheduled - NEW.days_count WHERE id = v_balance_id;
    ELSIF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      -- Pending request approved - add to scheduled
      UPDATE vacation_balances SET days_scheduled = days_scheduled + NEW.days_count WHERE id = v_balance_id;
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      -- No change to balance needed
      NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vacation request status changes
DROP TRIGGER IF EXISTS update_vacation_balance_on_request_trigger ON vacation_requests;
CREATE TRIGGER update_vacation_balance_on_request_trigger
AFTER INSERT OR UPDATE OF status ON vacation_requests
FOR EACH ROW
EXECUTE FUNCTION update_vacation_balance_on_request_status_change();
