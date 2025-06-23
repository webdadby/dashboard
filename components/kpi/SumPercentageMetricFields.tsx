'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MetricFormValues } from './MetricFormSchema';

const SumPercentageMetricFields: React.FC = () => {
  const form = useFormContext<MetricFormValues>();

  // Проверяем, что тип метрики - sum_percentage
  if (form.watch('type') !== 'sum_percentage') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-md mb-4">
        <h4 className="text-sm font-medium mb-2">Информация о метрике "Процент от суммы"</h4>
        <p className="text-sm text-muted-foreground">
          Эта метрика рассчитывает вознаграждение как процент от суммы, которая будет введена в результатах сотрудника.
          Формула расчета: <span className="font-mono">Выплата = Сумма результата × Процентная ставка / 100</span>
        </p>
      </div>

      <FormField
        control={form.control}
        name="base_rate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Процентная ставка (%)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="Например: 5" 
                {...field} 
                onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>
              Процент от суммы результата, который будет выплачен сотруднику
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Пример расчета */}
      {form.watch('base_rate') && (
        <div className="bg-primary/10 p-4 rounded-md">
          <h4 className="text-sm font-medium mb-2">Пример расчета:</h4>
          <p className="text-sm">
            При сумме результата <strong>100 000</strong> руб. и ставке <strong>{form.watch('base_rate')}%</strong>,
            выплата составит <strong>{((100000) * (form.watch('base_rate') || 0) / 100).toLocaleString('ru-RU')}</strong> руб.
          </p>
        </div>
      )}
    </div>
  );
};

export default SumPercentageMetricFields;
