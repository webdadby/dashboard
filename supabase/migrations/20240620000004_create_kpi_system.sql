-- Create enum for metric types
CREATE TYPE metric_type AS ENUM ('tiered', 'multiply', 'percentage');

-- Table for KPI metrics
CREATE TABLE kpi_metrics (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type metric_type NOT NULL,
  base_rate DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tiered metric rates
CREATE TABLE kpi_metric_tiers (
  id BIGSERIAL PRIMARY KEY,
  metric_id BIGINT NOT NULL REFERENCES kpi_metrics(id) ON DELETE CASCADE,
  min_value DECIMAL(10, 2) NOT NULL,
  max_value DECIMAL(10, 2),
  rate DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_range CHECK (max_value IS NULL OR min_value <= max_value)
);

-- Table for employee KPI results
CREATE TABLE kpi_results (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  metric_id BIGINT NOT NULL REFERENCES kpi_metrics(id) ON DELETE CASCADE,
  period DATE NOT NULL,  -- First day of the month for which the result is recorded
  value DECIMAL(10, 2) NOT NULL,
  calculated_bonus DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_employee_metric_period UNIQUE (employee_id, metric_id, period)
);

-- Enable Row Level Security
ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_metric_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_results ENABLE ROW LEVEL SECURITY;

-- Table for employee-metric associations
CREATE TABLE employee_metrics (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  metric_id BIGINT NOT NULL REFERENCES kpi_metrics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_employee_metric UNIQUE (employee_id, metric_id)
);

-- Enable Row Level Security for the new table
ALTER TABLE employee_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Enable all access for admins" 
ON kpi_metrics 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Policies for employee_metrics
CREATE POLICY "Enable all access for admins on employee_metrics" 
ON employee_metrics
TO authenticated
USING (auth.role() = 'authenticated');

-- Indexes for better performance
CREATE INDEX idx_employee_metrics_employee_id ON employee_metrics(employee_id);
CREATE INDEX idx_employee_metrics_metric_id ON employee_metrics(metric_id);

CREATE POLICY "Enable all access for admins" 
ON kpi_metric_tiers 
TO authenticated 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for admins" 
ON kpi_results 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_kpi_metrics_updated_at
BEFORE UPDATE ON kpi_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_metric_tiers_updated_at
BEFORE UPDATE ON kpi_metric_tiers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpi_results_updated_at
BEFORE UPDATE ON kpi_results
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
