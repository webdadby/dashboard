import { KpiMetric, MetricType } from './KpiTypes';
import { MetricFormValues } from './MetricFormSchema';

/**
 * Получает значения по умолчанию для формы метрики
 * @param metric Существующая метрика (если редактируем)
 * @returns Значения по умолчанию для формы
 */
export const getDefaultValues = (metric?: KpiMetric): MetricFormValues => {
  if (!metric) {
    // Default values for new metric
    const defaultType = 'multiply' as MetricType;
    
    // Base values for all metric types
    const baseValues = {
      name: '',
      description: '',
      base_rate: 0.01,
      employee_ids: [],
    };
    
    // Return type-specific values
    switch (defaultType) {
      case 'tiered':
        return {
          ...baseValues,
          type: 'tiered',
          tiers: [{ min_value: 0, max_value: null, rate: 0.01 }]
        };
      case 'sum_percentage':
        return {
          ...baseValues,
          type: 'sum_percentage',
        };
      case 'multiply':
      default:
        return {
          ...baseValues,
          type: 'multiply',
        };
    }
  }

  // For existing metrics, return their values using discriminated union
  const baseValues = {
    name: metric.name,
    description: metric.description || '',
    base_rate: metric.base_rate || 0.01, // Ensure base_rate is never undefined
    employee_ids: [],
  };
  
  switch (metric.type) {
    case 'tiered':
      return {
        ...baseValues,
        type: 'tiered',
        tiers: metric.tiers || [],
      };
    case 'multiply':
      return {
        ...baseValues,
        type: 'multiply',
      };
    case 'sum_percentage':
      return {
        ...baseValues,
        type: 'sum_percentage',
      };
    default:
      // Handle any other types as 'multiply'
      return {
        ...baseValues,
        type: 'multiply',
      };
  }
};
