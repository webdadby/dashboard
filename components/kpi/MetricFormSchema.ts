import * as z from 'zod';
import { MetricType } from './KpiTypes';

// Base schema with common fields
export const baseMetricSchema = {
  name: z.string().min(1, 'Обязательное поле'),
  type: z.enum(['tiered', 'multiply', 'sum_percentage']), // Removed 'percentage' type
  description: z.string().optional(),
  employee_ids: z.array(z.number()).min(1, 'Выберите хотя бы одного сотрудника'),
};

// Type-specific schemas
export const tieredMetricSchema = z.object({
  ...baseMetricSchema,
  type: z.literal('tiered'),
  base_rate: z.number().min(0.01, 'Минимальное значение: 0.01'),
  tiers: z.array(
    z.object({
      min_value: z.number().min(0, 'Минимальное значение: 0'),
      max_value: z.number().nullable(),
      rate: z.number().min(0.01, 'Минимальное значение: 0.01'),
    })
  ).min(1, 'Добавьте хотя бы один тарифный диапазон'),
});

export const multiplyMetricSchema = z.object({
  ...baseMetricSchema,
  type: z.literal('multiply'),
  base_rate: z.number().min(0.01, 'Минимальное значение: 0.01'),
});

// Schema for sum_percentage - no target metrics required
export const sumPercentageMetricSchema = z.object({
  ...baseMetricSchema,
  type: z.literal('sum_percentage'),
  base_rate: z.number().min(0.01, 'Минимальное значение: 0.01'),
});

// Union of all possible metric types
export const metricFormSchema = z.discriminatedUnion('type', [
  tieredMetricSchema,
  multiplyMetricSchema,
  sumPercentageMetricSchema,
]);  // Removed percentageMetricSchema

export type MetricFormValues = z.infer<typeof metricFormSchema>;
