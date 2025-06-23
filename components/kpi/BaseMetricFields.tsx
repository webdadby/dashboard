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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetricFormValues } from './MetricFormSchema';

const BaseMetricFields: React.FC = () => {
  const form = useFormContext<MetricFormValues>();

  return (
    <>
      {/* Название метрики */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Название метрики</FormLabel>
            <FormControl>
              <Input placeholder="Введите название метрики" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Описание метрики */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Описание (опционально)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Введите описание метрики" 
                className="resize-none" 
                {...field} 
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Тип метрики */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Тип метрики</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип метрики" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="tiered">Ступенчатая</SelectItem>
                <SelectItem value="multiply">Умножение</SelectItem>
                <SelectItem value="sum_percentage">Процент от суммы</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default BaseMetricFields;
