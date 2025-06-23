'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { kpiMetricsApi, employeeMetricsApi } from '@/lib/supabase/kpi';
import { KpiMetric } from './KpiTypes';
import { metricFormSchema, MetricFormValues } from './MetricFormSchema';
import { getDefaultValues } from './MetricFormUtils';

// Импорт компонентов полей формы
import BaseMetricFields from './BaseMetricFields';
import TieredMetricFields from './TieredMetricFields';
import MultiplyMetricFields from './MultiplyMetricFields';
import SumPercentageMetricFields from './SumPercentageMetricFields';
import EmployeeSelector from './EmployeeSelector';

interface MetricFormContainerProps {
  metric?: KpiMetric;
  onSave: () => void;
  onCancel: () => void;
}

const MetricFormContainer: React.FC<MetricFormContainerProps> = ({ metric, onSave, onCancel }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Инициализация формы с использованием React Hook Form и Zod
  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricFormSchema),
    defaultValues: getDefaultValues(metric),
    mode: 'onChange',
  });

  // Обработчик отправки формы
  const onSubmit = async (data: MetricFormValues) => {
    try {
      setIsSubmitting(true);

      // Подготовка данных для сохранения
      const metricData: any = {
        name: data.name,
        description: data.description,
        type: data.type === 'sum_percentage' ? 'percentage' : data.type, // Для совместимости с БД
        is_sum_percentage: data.type === 'sum_percentage', // Флаг для различения типов процентов
      };

      // Добавляем поля в зависимости от типа метрики
      if (data.type === 'tiered') {
        metricData.tiers = data.tiers;
      } else {
        metricData.base_rate = data.base_rate;
      }

      // Сохраняем метрику
      let metricId = metric?.id;
      if (metricId) {
        // Обновление существующей метрики
        await kpiMetricsApi.update(metricId, metricData);
      } else {
        // Создание новой метрики
        const newMetric = await kpiMetricsApi.create(metricData);
        metricId = newMetric.id;
      }

      // Обновляем связи с сотрудниками
      if (metricId) {
        await employeeMetricsApi.associateEmployees(metricId, data.employee_ids);
      }

      toast({
        title: metric?.id ? 'Метрика обновлена' : 'Метрика создана',
        description: 'Изменения успешно сохранены',
      });

      onSave();
    } catch (error) {
      console.error('Ошибка при сохранении метрики:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить метрику. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Отслеживаем изменение типа метрики для сброса ненужных полей
  const metricType = form.watch('type');
  
  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Базовые поля для всех типов метрик */}
          <BaseMetricFields />
          
          {/* Поля в зависимости от типа метрики */}
          <TieredMetricFields />
          <MultiplyMetricFields />
          <SumPercentageMetricFields />
          
          {/* Выбор сотрудников */}
          <EmployeeSelector metricId={metric?.id} />
          
          {/* Кнопки формы */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : metric?.id ? (
                'Сохранить изменения'
              ) : (
                'Создать метрику'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MetricFormContainer;
