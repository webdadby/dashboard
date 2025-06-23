// Types for KPI metrics
export type MetricType = 'tiered' | 'multiply' | 'percentage' | 'sum_percentage';

// Base employee type
export interface Employee {
  id: number;
  name: string;
  email?: string;
  position?: string;
  department?: string;
}

export interface BaseMetric {
  id?: number;
  name: string;
  description?: string;
  type: MetricType;
  base_rate?: number;
  created_at?: string;
  updated_at?: string;
  // Associated employees
  employees?: Employee[];
  // For form handling
  employee_ids?: number[];
}

export interface TieredMetric extends BaseMetric {
  type: 'tiered';
  tiers: {
    id?: number;
    min_value: number;
    max_value: number | null; // null means no upper bound
    rate: number;
  }[];
}

export interface MultiplyMetric extends BaseMetric {
  type: 'multiply';
  base_rate: number; // Rate per unit
}

export interface PercentageMetric extends BaseMetric {
  type: 'percentage';
  base_rate: number; // Amount when 100% achieved
}

export interface SumPercentageMetric extends BaseMetric {
  type: 'sum_percentage';
  base_rate: number; // Percentage to apply to the sum (e.g., 10 for 10%)
  is_sum_percentage?: boolean; // Flag for database compatibility
}

export type KpiMetric = TieredMetric | MultiplyMetric | PercentageMetric | SumPercentageMetric;

export interface KpiResult {
  id?: number;
  employee_id: number;
  metric_id: number;
  period: string; // YYYY-MM-DD format (first day of month)
  value: number;
  calculated_bonus: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeKpiResult {
  employee: {
    id: number;
    name: string;
    position: string;
  };
  results: Array<{
    metric: KpiMetric;
    result?: KpiResult;
    calculatedBonus: number;
  }>;
}

// Helper type for metric form values
export type MetricFormValues = {
  name: string;
  description: string;
  type: MetricType;
  base_rate?: number;
  employee_ids: number[]; // Array of employee IDs this metric applies to
  tiers?: Array<{
    min_value: number;
    max_value: number | ''; // Empty string for null in form
    rate: number;
  }>;
}

// Type guard functions
export function isTieredMetric(metric: KpiMetric): metric is TieredMetric {
  return metric.type === 'tiered';
}

export function isMultiplyMetric(metric: KpiMetric): metric is MultiplyMetric {
  return metric.type === 'multiply';
}

export function isPercentageMetric(metric: KpiMetric): metric is PercentageMetric {
  return metric.type === 'percentage';
}

export function isSumPercentageMetric(metric: KpiMetric): metric is SumPercentageMetric {
  return metric.type === 'sum_percentage';
}
