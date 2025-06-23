import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import { kpiMetricsApi, kpiResultsApi, kpiCalculations } from '@/lib/supabase/kpi';
import { employeesApi } from '@/lib/supabase/employees';
import { KpiMetric, KpiResult, isTieredMetric, isMultiplyMetric, isPercentageMetric, isSumPercentageMetric } from './KpiTypes';

interface UseKpiDataProps {
  period?: Date;
}

export function useKpiData({ period = new Date() }: UseKpiDataProps = {}) {
  const [metrics, setMetrics] = useState<KpiMetric[]>([]);
  const [results, setResults] = useState<KpiResult[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; position: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const periodString = format(period, 'yyyy-MM-01');

  // Load all necessary data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load metrics, employees, and results in parallel
      const [metricsData, employeesData] = await Promise.all([
        kpiMetricsApi.getAll(),
        employeesApi.getAll(),
      ]);

      // Get results for the current period
      const resultsData = await kpiResultsApi.getByPeriod(periodString);

      setMetrics(metricsData);
      setEmployees(employeesData.map(e => ({
        id: e.id,
        name: e.name,
        position: e.position || '',
      })));
      setResults(resultsData);
    } catch (err) {
      console.error('Error loading KPI data:', err);
      setError('Не удалось загрузить данные. Пожалуйста, попробуйте обновить страницу.');
    } finally {
      setIsLoading(false);
    }
  }, [periodString]);

  // Load data on mount and when period changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate bonus based on metric type and value
  const calculateBonus = useCallback((metric: KpiMetric, value: number): number => {
    if (isTieredMetric(metric)) {
      return kpiCalculations.calculateTieredBonus(value, metric.tiers || []);
    }
    
    if (isMultiplyMetric(metric) && metric.base_rate !== undefined) {
      return kpiCalculations.calculateMultiplyBonus(value, metric.base_rate);
    }
    
    if (isPercentageMetric(metric) && metric.base_rate !== undefined) {
      // For percentage metrics, the value is the achieved percentage (0-100)
      return kpiCalculations.calculatePercentageBonus(value, 100, metric.base_rate);
    }
    
    if (isSumPercentageMetric(metric) && metric.base_rate !== undefined) {
      // For sum_percentage metrics, calculate as value * percentage / 100
      return value * metric.base_rate / 100;
    }
    
    return 0;
  }, []);

  // Save KPI results for an employee
  const saveEmployeeResults = useCallback(async (
    employeeId: number,
    values: Array<{ metricId: number; value: number }>
  ): Promise<void> => {
    try {
      setIsSaving(true);
      
      const resultsToSave = values.map(({ metricId, value }) => {
        const metric = metrics.find(m => m.id === metricId);
        if (!metric) throw new Error(`Метрика с ID ${metricId} не найдена`);
        
        const calculatedBonus = calculateBonus(metric, value);
        
        return {
          employee_id: employeeId,
          metric_id: metricId,
          period: periodString,
          value,
          calculated_bonus: calculatedBonus,
        };
      });

      await kpiResultsApi.saveResults(resultsToSave);
      await loadData(); // Refresh the data
    } catch (err) {
      console.error('Error saving KPI results:', err);
      throw new Error('Не удалось сохранить результаты. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSaving(false);
    }
  }, [calculateBonus, loadData, metrics, periodString]);

  // Get results for a specific employee
  const getEmployeeResults = useCallback((employeeId: number) => {
    return results.filter(r => r.employee_id === employeeId);
  }, [results]);

  // Get all metrics with results for a specific employee
  const getEmployeeMetricsWithResults = useCallback((employeeId: number) => {
    return metrics.map(metric => {
      const result = results.find(r => 
        r.employee_id === employeeId && r.metric_id === metric.id
      );
      
      return {
        metric,
        result,
        calculatedBonus: result?.calculated_bonus || 0,
      };
    });
  }, [metrics, results]);

  // Get total bonus for an employee
  const getEmployeeTotalBonus = useCallback((employeeId: number): number => {
    const employeeResults = results.filter(r => r.employee_id === employeeId);
    return employeeResults.reduce((sum, r) => sum + (r.calculated_bonus || 0), 0);
  }, [results]);

  return {
    metrics,
    results,
    employees,
    isLoading,
    isSaving,
    error,
    period: periodString,
    loadData,
    saveEmployeeResults,
    getEmployeeResults,
    getEmployeeMetricsWithResults,
    getEmployeeTotalBonus,
    calculateBonus,
  };
}

export default useKpiData;
