import { useState, useEffect } from 'react';
import { kpiResultsApi, kpiMetricsApi, kpiCalculations } from '@/lib/supabase/kpi';

/**
 * Хук для получения и расчета KPI бонусов сотрудника за указанный период
 */
export function useKpiBonus(employeeId: number, year: number, month: number) {
  const [kpiTotalBonus, setKpiTotalBonus] = useState<number>(0);
  const [isLoadingKpiBonus, setIsLoadingKpiBonus] = useState<boolean>(false);

  useEffect(() => {
    async function loadKpiBonus() {
      if (!employeeId) return;
      
      setIsLoadingKpiBonus(true);
      try {
        // Получаем все метрики
        const metrics = await kpiMetricsApi.getAll();
        if (!metrics || metrics.length === 0) {
          console.log('Нет доступных KPI метрик');
          setKpiTotalBonus(0);
          return;
        }
        
        // Получаем результаты KPI для сотрудника за период
        const results = await kpiResultsApi.getByEmployeeAndPeriod(employeeId, year, month);
        
        // Если нет результатов, возвращаем 0
        if (!results || results.length === 0) {
          console.log('Нет результатов KPI для сотрудника за указанный период');
          setKpiTotalBonus(0);
          return;
        }
        
        // Создаем карту результатов по ID метрики
        const resultsMap = new Map();
        results.forEach(result => {
          resultsMap.set(result.metric_id, result.value);
        });
        
        // Рассчитываем общую сумму бонуса
        let totalBonus = 0;
        metrics.forEach(metric => {
          if (resultsMap.has(metric.id)) {
            const value = resultsMap.get(metric.id);
            
            if (metric.type === 'tiered') {
              totalBonus += kpiCalculations.calculateTieredBonus(value, metric.tiers || []);
            } else if (metric.type === 'multiply') {
              totalBonus += kpiCalculations.calculateMultiplyBonus(value, metric.base_rate || 0);
            } else if (metric.type === 'percentage') {
              totalBonus += kpiCalculations.calculatePercentageBonus(value, 100, metric.base_rate || 0);
            } else if (metric.type === 'sum_percentage') {
              totalBonus += value * (metric.base_rate || 0) / 100;
            }
          }
        });
        
        setKpiTotalBonus(totalBonus);
      } catch (error) {
        console.error('Ошибка при загрузке данных о KPI-премиях:', error instanceof Error ? error.message : JSON.stringify(error));
        setKpiTotalBonus(0);
      } finally {
        setIsLoadingKpiBonus(false);
      }
    }
    
    loadKpiBonus();
  }, [employeeId, year, month]);

  return { kpiTotalBonus, isLoadingKpiBonus };
}
