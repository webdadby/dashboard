'use client';

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { MetricFormValues } from './MetricFormSchema';

const TieredMetricFields: React.FC = () => {
  const form = useFormContext<MetricFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tiers",
  });

  // Проверяем, что тип метрики - tiered
  if (form.watch('type') !== 'tiered') {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Тарифные диапазоны</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ min_value: 0, max_value: null, rate: 0.01 })}
          >
            <Plus className="h-4 w-4 mr-1" /> Добавить диапазон
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <FormField
                control={form.control}
                name={`tiers.${index}.min_value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>От</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-3">
              <FormField
                control={form.control}
                name={`tiers.${index}.max_value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>До (пусто = без ограничения)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        value={field.value === null ? '' : field.value}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-4">
              <FormField
                control={form.control}
                name={`tiers.${index}.rate`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ставка</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fields.length > 1 && remove(index)}
                disabled={fields.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default TieredMetricFields;
