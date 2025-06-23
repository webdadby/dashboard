import { createClient } from '@/lib/supabase/client';
import { KpiMetric, KpiResult, MetricType, isTieredMetric, Employee } from '@/components/kpi/KpiTypes'; 
import { PostgrestError } from '@supabase/supabase-js';

const supabase = createClient();

// KPI Metrics
export const kpiMetricsApi = {
  // Get all metrics
  async getAll(): Promise<KpiMetric[]> {
    const { data, error } = await supabase
      .from('kpi_metrics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // For tiered metrics, fetch their tiers
    const metricsWithTiers = await Promise.all(
      (data || []).map(async (metric) => {
        if (metric.type === 'tiered') {
          const { data: tiers } = await supabase
            .from('kpi_metric_tiers')
            .select('*')
            .eq('metric_id', metric.id)
            .order('min_value', { ascending: true });
          
          return { ...metric, tiers: tiers || [] };
        }
        return metric;
      })
    );

    return metricsWithTiers as KpiMetric[];
  },

  // Get a single metric by ID
  async getById(id: number): Promise<KpiMetric | null> {
    const { data, error } = await supabase
      .from('kpi_metrics')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    if (!data) return null;

    if (data.type === 'tiered') {
      const { data: tiers } = await supabase
        .from('kpi_metric_tiers')
        .select('*')
        .eq('metric_id', id)
        .order('min_value', { ascending: true });
      
      return { ...data, tiers: tiers || [] } as KpiMetric;
    }

    return data as KpiMetric;
  },

  // Create a new metric
  async create(metric: Omit<KpiMetric, 'id' | 'created_at' | 'updated_at'>): Promise<KpiMetric> {
    // Extract employee_ids if they exist
    const { employee_ids, ...metricData } = metric as any;
    
    // Create the base metric
    const { data: newMetric, error } = await supabase
      .from('kpi_metrics')
      .insert({
        name: metric.name,
        description: metric.description,
        type: metric.type,
        base_rate: metric.base_rate,
      })
      .select()
      .single();

    if (error) throw error;

    // If it's a tiered metric, create the tiers
    if (metric.type === 'tiered' && 'tiers' in metric && Array.isArray(metric.tiers)) {
      if (metric.tiers.length > 0) {
        const tiersWithMetricId = metric.tiers.map(tier => ({
          ...tier,
          metric_id: newMetric.id,
        }));

        const { error: tiersError } = await supabase
          .from('kpi_metric_tiers')
          .insert(tiersWithMetricId);

        if (tiersError) throw tiersError;
      }
    }

    // Associate employees with the metric
    if (employee_ids) {
      const newAssociations = employee_ids.map(employeeId => ({
        metric_id: newMetric.id,
        employee_id: employeeId
      }));

      const { error: insertError } = await supabase
        .from('employee_metrics')
        .insert(newAssociations);

      if (insertError) throw insertError;
    }

    return await this.getById(newMetric.id) as KpiMetric;
  },

  // Update a metric
  async update(
    id: number,
    updates: Partial<Omit<KpiMetric, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<KpiMetric> {
    // Extract only the fields that belong to kpi_metrics
    const { tiers, ...metricUpdates } = updates as any;
    
    // Remove employee_ids if it exists in the updates
    if ('employee_ids' in metricUpdates) {
      delete (metricUpdates as any).employee_ids;
    }
    
    const { data: metric, error: metricError } = await supabase
      .from('kpi_metrics')
      .update(metricUpdates)
      .eq('id', id)
      .select()
      .single();

    if (metricError) throw metricError;

    // If it's a tiered metric, update tiers
    if (updates.type === 'tiered' && 'tiers' in updates && Array.isArray(updates.tiers)) {
      // First, delete existing tiers
      const { error: deleteError } = await supabase
        .from('kpi_metric_tiers')
        .delete()
        .eq('metric_id', id);

      if (deleteError) throw deleteError;

      // Then insert new tiers if they exist
      if (updates.tiers.length > 0) {
        const { error: tiersError } = await supabase
          .from('kpi_metric_tiers')
          .insert(
            updates.tiers.map((tier: any) => ({
              metric_id: id,
              min_value: tier.min_value,
              max_value: tier.max_value,
              rate: tier.rate,
            }))
          );

        if (tiersError) throw tiersError;
      }
    }


    return await this.getById(id) as KpiMetric;
  },

  // Delete a metric
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('kpi_metrics')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// KPI Results
// Employee-Metric Associations
export const employeeMetricsApi = {
  // Get all employees associated with a metric
  async getEmployeesForMetric(metricId: number): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employee_metrics')
      .select('employees(*)')
      .eq('metric_id', metricId);

    if (error) throw error;
    return (data || []).map((item: any) => item.employees);
  },

  // Get all metrics for an employee
  async getMetricsForEmployee(employeeId: number): Promise<KpiMetric[]> {
    const { data, error } = await supabase
      .from('employee_metrics')
      .select('kpi_metrics(*)')
      .eq('employee_id', employeeId);

    if (error) throw error;
    return (data || []).map((item: any) => item.kpi_metrics);
  },

  // Associate employees with a metric
  async associateEmployees(metricId: number, employeeIds: number[]): Promise<void> {
    try {
      // First, remove all existing associations for this metric
      const { error: deleteError } = await supabase
        .from('employee_metrics')
        .delete()
        .eq('metric_id', metricId);

      if (deleteError) throw deleteError;

      // Then add the new associations
      if (employeeIds.length > 0) {
        const newAssociations = employeeIds.map((employeeId: number) => ({
          metric_id: metricId,
          employee_id: employeeId
        }));

        const { error: insertError } = await supabase
          .from('employee_metrics')
          .insert(newAssociations);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error associating employees with metric:', error);
      throw error;
    }
  },
};

export const kpiResultsApi = {
  // Get results for a specific period
  async getByPeriod(period: string): Promise<KpiResult[]> {
    const { data, error } = await supabase
      .from('kpi_results')
      .select('*')
      .eq('period', period);

    if (error) throw error;
    return data || [];
  },

  // Get results for a specific employee and period
  async getByEmployeeAndPeriod(employeeId: number, period: string): Promise<KpiResult[]> {
    const { data, error } = await supabase
      .from('kpi_results')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('period', period);

    if (error) throw error;
    return data || [];
  },

  // Save or update results
  async saveResults(results: Omit<KpiResult, 'id' | 'created_at' | 'updated_at'>[]): Promise<KpiResult[]> {
    // Using upsert to handle both insert and update in one operation
    const { data, error } = await supabase
      .from('kpi_results')
      .upsert(
        results.map(r => ({
          employee_id: r.employee_id,
          metric_id: r.metric_id,
          period: r.period,
          value: r.value,
          calculated_bonus: r.calculated_bonus,
        })),
        { 
          onConflict: 'employee_id,metric_id,period',
          ignoreDuplicates: false,
        }
      )
      .select();

    if (error) throw error;
    return data || [];
  },
};

// Utility functions for calculations
export const kpiCalculations = {
  calculateTieredBonus(value: number, tiers: { min_value: number; max_value: number | null; rate: number }[]): number {
    let bonus = 0;
    
    for (const tier of tiers) {
      if (value >= tier.min_value && (tier.max_value === null || value <= tier.max_value)) {
        bonus = value * tier.rate;
        break;
      }
    }
    
    return bonus;
  },

  calculateMultiplyBonus(value: number, rate: number): number {
    return value * rate;
  },

  calculatePercentageBonus(value: number, target: number, baseRate: number): number {
    if (target <= 0) return 0;
    const percentage = Math.min(value / target, 1); // Cap at 100%
    return baseRate * percentage;
  },

  calculateSumPercentageBonus(
    targetMetrics: number[], // IDs of metrics to sum up
    allResults: { [metricId: number]: number }, // Map of metric ID to its value
    percentage: number // The percentage to apply to the sum (e.g., 10 for 10%)
  ): number {
    // Calculate the sum of all target metrics
    const sum = targetMetrics.reduce((total, metricId) => {
      return total + (allResults[metricId] || 0);
    }, 0);
    
    // Apply the percentage to the sum (convert percentage to decimal)
    return (sum * percentage) / 100;
  },
};
