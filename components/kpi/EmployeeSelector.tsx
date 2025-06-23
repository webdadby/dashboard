'use client';

import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase/client';
import { Employee } from './KpiTypes';
import { MetricFormValues } from './MetricFormSchema';
import { Loader2 } from 'lucide-react';

const EmployeeSelector: React.FC<{ metricId?: number }> = ({ metricId }) => {
  const form = useFormContext<MetricFormValues>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Загрузка сотрудников
  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true);
      try {
        // Получаем всех активных сотрудников
        const { data: employeesData, error } = await supabase
          .from('employees')
          .select('id, name, position')
          .is('termination_date', null)
          .order('name');

        if (error) throw error;
        // Explicitly cast the data to Employee[] type
        setEmployees((employeesData || []) as Employee[]);
        
        // Если есть ID метрики, загружаем связанных сотрудников
        if (metricId) {
          await loadAssociatedEmployees(metricId);
        }
      } catch (error) {
        console.error('Ошибка при загрузке сотрудников:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, [metricId]);

  // Загрузка связанных с метрикой сотрудников
  const loadAssociatedEmployees = async (metricId: number) => {
    try {
      const { data, error } = await supabase
        .from('employee_metrics')
        .select('employee_id')
        .eq('metric_id', metricId);

      if (error) throw error;
      
      // Устанавливаем выбранных сотрудников в форму
      if (data && data.length > 0) {
        const employeeIds = data.map(item => item.employee_id as number);
        form.setValue('employee_ids', employeeIds);
      }
    } catch (error) {
      console.error('Ошибка при загрузке связанных сотрудников:', error);
    }
  };

  return (
    <FormField
      control={form.control}
      name="employee_ids"
      render={() => (
        <FormItem>
          <FormLabel>Сотрудники</FormLabel>
          <FormControl>
            <div className="border rounded-md p-2">
              {isLoading ? (
                <div className="flex justify-center items-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="employee_ids"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(employee.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = [...(field.value || [])];
                                    if (checked) {
                                      field.onChange([...currentValue, employee.id]);
                                    } else {
                                      field.onChange(currentValue.filter((id) => id !== employee.id));
                                    }
                                  }}
                                />
                              </FormControl>
                              <label
                                htmlFor={`employee-${employee.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {employee.name} ({employee.position})
                              </label>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default EmployeeSelector;
