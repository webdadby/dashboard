-- Add sum_percentage to metric_type enum
ALTER TYPE metric_type ADD VALUE IF NOT EXISTS 'sum_percentage';

-- Add comment to explain the new metric type
COMMENT ON TYPE metric_type IS 'Defines the type of KPI metric: tiered (tiered rates), multiply (value * rate), percentage (% of target), sum_percentage (% of sum of other metrics)';
