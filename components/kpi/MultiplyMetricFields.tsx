'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MetricFormValues } from './MetricFormSchema';

const MultiplyMetricFields: React.FC = () => {
  const form = useFormContext<MetricFormValues>();

  // Проверяем, что тип метрики - multiply
  if (form.watch('type') !== 'multiply') {
    return null;
  }

  return (
    <FormField
      control={form.control}
      name="base_rate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Базовая ставка</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              step="0.01" 
              {...field} 
              onChange={e => field.onChange(parseFloat(e.target.value))} 
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default MultiplyMetricFields;
