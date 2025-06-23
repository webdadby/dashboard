'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { KpiMetric, MetricType, Employee } from './KpiTypes';
import { createClient } from '@/lib/supabase/client';
import { kpiMetricsApi, employeeMetricsApi } from '@/lib/supabase/kpi';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const supabase = createClient();

// Base schema with common fields
const baseMetricSchema = {
  name: z.string().min(1, 'Обязательное поле'),
  type: z.enum(['tiered', 'multiply', 'percentage', 'sum_percentage']),
  description: z.string().optional(),
  employee_ids: z.array(z.number()).min(1, 'Выберите хотя бы одного сотрудника'),
};

// Type-specific schemas
const tieredMetricSchema = z.object({
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

const multiplyMetricSchema = z.object({
  ...baseMetricSchema,
  type: z.literal('multiply'),
  base_rate: z.number().min(0.01, 'Минимальное значение: 0.01'),
});

const percentageMetricSchema = z.object({
  ...baseMetricSchema,
  type: z.literal('percentage'),
  base_rate: z.number().min(0.01, 'Минимальное значение: 0.01'),
});

// Schema for sum_percentage - no target metrics required
const sumPercentageMetricSchema = z.object({
  ...baseMetricSchema,
  type: z.literal('sum_percentage'),
  base_rate: z.number().min(0.01, 'Минимальное значение: 0.01'),
  base_amount: z.number().min(1, 'Минимальное значение: 1').optional(),
});



// Union of all possible metric types
const metricFormSchema = z.discriminatedUnion('type', [
  tieredMetricSchema,
  multiplyMetricSchema,
  percentageMetricSchema,
  sumPercentageMetricSchema,
]);

type MetricFormValues = z.infer<typeof metricFormSchema>;

interface MetricFormProps {
  metric?: KpiMetric;
  onSave: () => void;
  onCancel: () => void;
}

export const MetricForm: React.FC<MetricFormProps> = ({ metric, onSave, onCancel }) => {
  // Helper function to get default values based on metric type
  // Функция для получения значений по умолчанию в зависимости от типа метрики
  const getDefaultValues = (): MetricFormValues => {
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
            base_amount: 1000
          };
        case 'percentage':
          return {
            ...baseValues,
            type: 'percentage',
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
      base_rate: metric.base_rate,
      // Используем пустой массив, так как associatedEmployees загружается асинхронно
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
      case 'percentage':
        return {
          ...baseValues,
          type: 'percentage',
        };
      case 'sum_percentage':
        return {
          ...baseValues,
          type: 'sum_percentage',
          base_amount: metric.base_amount || 1000
        };
      default:
        return {
          ...baseValues,
          type: 'multiply',
        };
    }
  };

  const defaultValues = getDefaultValues();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTiers, setCurrentTiers] = useState<Array<{ min_value: number; max_value: number | null; rate: number }>>([]);
  const [availableMetrics, setAvailableMetrics] = useState<Array<{ id: number; name: string }>>([]);

  // Load employees and available metrics when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Load employees
        const { data: employees, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .order('name');

        if (employeesError) throw employeesError;
        setEmployees(employees || []);

        // Load available metrics (for sum_percentage target metrics)
        const { data: metrics, error: metricsError } = await supabase
          .from('kpi_metrics')
          .select('id, name')
          .neq('type', 'sum_percentage') // Don't allow selecting other sum_percentage metrics
          .order('name');

        if (metricsError) throw metricsError;
        setAvailableMetrics(metrics || []);

        // Set current tiers if editing an existing tiered metric
        if (metric) {
          if (metric.type === 'tiered') {
            const tieredMetric = metric as any;
            if (tieredMetric.tiers && Array.isArray(tieredMetric.tiers)) {
              setCurrentTiers(tieredMetric.tiers);
            }
          } else if (metric.type === 'sum_percentage') {
            const sumPercentageMetric = metric as any;
            if (sumPercentageMetric.target_metrics) {
              form.setValue('target_metrics', sumPercentageMetric.target_metrics);
            }
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить необходимые данные',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [metric, toast]);

  // Load associated employees if editing
  useEffect(() => {
    async function loadAssociatedEmployees() {
      if (!metric?.id) return;

      try {
        const associatedEmployees = await employeeMetricsApi.getEmployeesForMetric(metric.id);
        const employeeIds = associatedEmployees.map(emp => emp.id);
        form.setValue('employee_ids', employeeIds);
      } catch (error) {
        console.error('Error loading associated employees:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить назначенных сотрудников',
          variant: 'destructive',
        });
      }
    }

    loadAssociatedEmployees();
  }, [metric?.id, toast]);

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricFormSchema),
    defaultValues,
  });
  
  const {
    control, 
    handleSubmit, 
    watch, 
    formState: { errors, isSubmitting: isFormSubmitting }, 
    reset,
    setValue,
    getValues,
    register,
  } = form;

  // Access metricType after form is initialized
  const metricType = watch('type');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tiers' as const, // Cast to const to handle the discriminated union
  });
  
  // Reset form when metric type changes for new metrics
  useEffect(() => {
    if (metric) return; // Don't reset if we're editing an existing metric
    
    const currentValues = form.getValues();
    let resetValues: any = {
      base_rate: 0.01,
    };
    
    if (metricType === 'tiered') {
      resetValues = {
        ...resetValues,
        tiers: [{ min_value: 0, max_value: null, rate: 0.01 }]
      };
    } else if (metricType === 'sum_percentage') {
      resetValues = {
        ...resetValues,
        target_metrics: []
      };
    }
    
    form.reset({
      ...currentValues,
      ...resetValues,
    } as MetricFormValues);
  }, [metric, metricType, form]);

  // Add a new tier
  const addTier = () => {
    const lastTier = fields[fields.length - 1];
    const newMinValue = lastTier ? Number(lastTier.max_value || 0) + 1 : 0;

    append({
      min_value: newMinValue,
      max_value: null,
      rate: 0,
    });
  };

  const onSubmit = async (values: MetricFormValues) => {
    setIsSubmitting(true);
    try {
      // Type guard for tiered metric
      const isTieredMetric = (data: MetricFormValues): data is Extract<MetricFormValues, { type: 'tiered' }> => {
        return data.type === 'tiered';
      };

      // Type guard for sum_percentage metric
      const isSumPercentageMetric = (data: MetricFormValues): data is Extract<MetricFormValues, { type: 'sum_percentage' }> => {
        return data.type === 'sum_percentage';
      };

      // Prepare the data for the API
      const metricData: any = {
        name: values.name,
        description: values.description,
        // Преобразуем sum_percentage в percentage для базы данных
        type: values.type === 'sum_percentage' ? 'percentage' : values.type,
        base_rate: values.base_rate,
      };

      // Добавляем поле is_sum_percentage для различения типов percentage
      if (values.type === 'sum_percentage') {
        metricData.is_sum_percentage = true;
        metricData.base_amount = values.base_amount;
      }

      // Add type-specific fields
      if (isTieredMetric(values)) {
        metricData.tiers = values.tiers;
      }

      if (metric?.id) {
        // Update existing metric
        await kpiMetricsApi.update(metric.id, metricData);
        
        // Update employee associations
        await employeeMetricsApi.associateEmployees(metric.id, values.employee_ids);
        
        toast({
          title: 'Успех',
          description: 'Метрика успешно обновлена',
        });
      } else {
        // Create new metric
        const newMetric = await kpiMetricsApi.create(metricData);
        
        // Associate employees with the new metric
        if (newMetric && newMetric.id) {
          await employeeMetricsApi.associateEmployees(newMetric.id, values.employee_ids);
        }
        
        toast({
          title: 'Успех',
          description: 'Метрика успешно создана',
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving metric:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить метрику',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название метрики</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Введите название метрики" 
                  {...field} 
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тип метрики</FormLabel>
              <FormControl>
                <Select
                  value={metricType}
                  onValueChange={(value) => {
                    setValue('type', value as MetricType);
                    if (value !== 'tiered') {
                      setValue('tiers', []);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип метрики" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiered">Диапазонные ставки</SelectItem>
                    <SelectItem value="multiply">Умножение на ставку</SelectItem>
                    <SelectItem value="percentage">Процент от цели</SelectItem>
                    <SelectItem value="sum_percentage">Процент от суммы</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание (необязательно)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Краткое описание метрики"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="employee_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Назначить сотрудникам</FormLabel>
              <FormControl>
                <ScrollArea className="h-40 rounded-md border p-2">
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`employee-${employee.id}`}
                          checked={form.watch('employee_ids')?.includes(employee.id) || false}
                          onCheckedChange={(checked) => {
                            const currentIds = form.getValues('employee_ids') || [];
                            const newIds = checked
                              ? [...currentIds, employee.id]
                              : currentIds.filter((id) => id !== employee.id);
                            form.setValue('employee_ids', newIds, { shouldValidate: true });
                          }}
                          disabled={isSubmitting}
                        />
                        <Label htmlFor={`employee-${employee.id}`} className="text-sm font-normal">
                          {employee.name} {employee.position ? `(${employee.position})` : ''}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {(metricType === 'multiply' || metricType === 'percentage') && (
          <FormField
            control={form.control}
            name="base_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {metricType === 'multiply' ? 'Ставка за единицу (руб.)' : 'Максимальная премия (руб.)'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {metricType === 'tiered' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Тарифные диапазоны</h4>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <FormField
                  control={control}
                  name={`tiers.${index}.min_value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>От</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`tiers.${index}.max_value`}
                  render={({ field }) => {
                    return (
                      <FormItem className="flex-1">
                        <FormLabel>До</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            value={field.value === null ? '' : field.value}
                            onChange={(e) => 
                              field.onChange(e.target.value === '' ? null : Number(e.target.value))
                            }
                            disabled={isSubmitting}
                            placeholder="Пусто для верхней границы"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={control}
                  name={`tiers.${index}.rate`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Ставка</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mb-1"
                  onClick={() => remove(index)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addTier}
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" /> Добавить диапазон
            </Button>
          </div>
        )}

        {metricType === 'sum_percentage' && (
          <div className="space-y-4">
            <FormField
              control={control}
              name="base_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Процент от суммы
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Например, 10 для 10%"
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(isNaN(value) ? 0.01 : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Укажите процент, который будет начисляться от базовой суммы
                  </FormDescription>
                  {form.formState.errors.base_rate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.base_rate.message}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
        )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
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

export default MetricForm;
