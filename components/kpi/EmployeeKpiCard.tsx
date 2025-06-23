'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Save, Info } from 'lucide-react';
import { KpiMetric, KpiResult, Employee } from './KpiTypes';
import { kpiCalculations, employeeMetricsApi, kpiResultsApi } from '@/lib/supabase/kpi';
import { useToast } from '@/components/ui/use-toast';

interface EmployeeKpiCardProps {
  employee: {
    id: number;
    name: string;
    position: string;
  };
  period: string; // YYYY-MM-DD format (first day of month)
  metrics: Array<{
    metric: KpiMetric;
    result?: KpiResult;
  }>;
  onSave: (employeeId: number, results: Array<{ metricId: number; value: number }>, period: string) => Promise<void>;
  isSaving: boolean;
}

export const EmployeeKpiCard: React.FC<EmployeeKpiCardProps> = ({
  employee,
  period,
  metrics,
  onSave,
  isSaving,
}) => {
  const { toast } = useToast();
  const [filteredMetrics, setFilteredMetrics] = useState<Array<{ metric: KpiMetric; result?: KpiResult }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter metrics to only show those assigned to the employee and load results for the period
  useEffect(() => {
    async function loadEmployeeMetrics() {
      try {
        setIsLoading(true);
        
        // Get metrics assigned to the employee
        const assignedMetrics = await employeeMetricsApi.getMetricsForEmployee(employee.id);
        const assignedMetricIds = new Set(assignedMetrics.map(m => m.id));
        
        // Get results for the current period
        const results = await kpiResultsApi.getByEmployeeAndPeriod(employee.id, period);
        
        // Create a map of metric_id to result for quick lookup
        const resultsMap = new Map<number, KpiResult>();
        results.forEach((result: KpiResult) => {
          resultsMap.set(result.metric_id, result);
        });
        
        // Filter metrics to only those assigned to the employee and add results
        const filtered = metrics
          .filter(m => m.metric.id !== undefined && assignedMetricIds.has(m.metric.id))
          .map(m => ({
            metric: m.metric,
            result: m.metric.id !== undefined ? resultsMap.get(m.metric.id) : undefined
          }));
          
        setFilteredMetrics(filtered);
      } catch (error) {
        console.error('Error loading employee metrics:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить данные по метрикам',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadEmployeeMetrics();
  }, [employee.id, metrics, period, toast]);
  
  const [values, setValues] = useState<Record<number, number>>(
    filteredMetrics.reduce((acc, { metric, result }) => {
      if (metric.id) {
        acc[metric.id] = result?.value ?? 0;
      }
      return acc;
    }, {} as Record<number, number>)
  );
  
  // Update values when filtered metrics change
  useEffect(() => {
    setValues(prevValues => {
      const newValues = { ...prevValues };
      filteredMetrics.forEach(({ metric, result }) => {
        if (result && newValues[metric.id!] === undefined) {
          newValues[metric.id!] = result.value;
        } else if (newValues[metric.id!] === undefined) {
          newValues[metric.id!] = 0;
        }
      });
      return newValues;
    });
  }, [filteredMetrics]);

  const handleValueChange = (metricId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues((prev) => ({
      ...prev,
      [metricId]: numValue,
    }));
  };

  const handleSave = async () => {
    const results = Object.entries(values).map(([metricId, value]) => ({
      metricId: parseInt(metricId, 10),
      value: value || 0,
    }));

    await onSave(employee.id, results, period);
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">
            {employee.name} <span className="text-muted-foreground text-sm">{employee.position}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (filteredMetrics.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">
            {employee.name} <span className="text-muted-foreground text-sm">{employee.position}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Нет назначенных метрик</p>
        </CardContent>
      </Card>
    );
  }

  const hasTieredMetrics = filteredMetrics.some((m) => m.metric.type === 'tiered');
  const hasNonTieredMetrics = filteredMetrics.some((m) => m.metric.type !== 'tiered');

  const calculateBonus = (metric: KpiMetric, value: number): number => {
    if (metric.type === 'tiered') {
      return kpiCalculations.calculateTieredBonus(value, metric.tiers || []);
    } else if (metric.type === 'multiply') {
      return kpiCalculations.calculateMultiplyBonus(value, metric.base_rate || 0);
    } else if (metric.type === 'percentage') {
      return kpiCalculations.calculatePercentageBonus(value, 100, metric.base_rate || 0);
    } else if (metric.type === 'sum_percentage') {
      // Для метрики типа "процент от суммы" рассчитываем премию как введенное значение * процент / 100
      return value * (metric.base_rate || 0) / 100;
    }
    return 0;
  };

  const getInputSuffix = (metric: KpiMetric) => {
    switch (metric.type) {
      case 'percentage':
        return '%';
      case 'multiply':
        return 'ед.';
      case 'sum_percentage':
        return '₽'; // Для ввода суммы в рублях
      default:
        return '';
    }
  };

  const totalBonus = filteredMetrics.reduce((sum, { metric }) => {
    if (!metric.id) return sum;
    return sum + calculateBonus(metric, values[metric.id] || 0);
  }, 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{employee.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Итого премия</div>
            <div className="text-xl font-semibold">{totalBonus.toFixed(2)} ₽</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-6">
          {hasNonTieredMetrics && (
            <div className="space-y-2">
              {filteredMetrics
                .filter(({ metric }) => metric.type !== 'tiered')
                .map(({ metric }) => (
                  <div key={metric.id} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <div className="font-medium">{metric.name}</div>
                      {/* <div className="text-sm text-muted-foreground">
                        {metric.description}
                      </div> */}
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={metric.type === 'percentage' ? 1 : 0.01}
                          value={values[metric.id!] || ''}
                          onChange={(e) => handleValueChange(metric.id!, e.target.value)}
                          className="pr-8"
                        />
                        {getInputSuffix(metric) && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {getInputSuffix(metric)}
                          </div>
                        )}
                        {metric.type === 'sum_percentage' && (
                          <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Сумма, от которой рассчитывается {metric.base_rate}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="text-sm">
                        <span className="font-medium">
                          {calculateBonus(metric, values[metric.id!] || 0).toFixed(2)} ₽
                        </span>
                        {metric.type === 'sum_percentage' && (
                          <span className="text-muted-foreground text-xs ml-2">
                            {values[metric.id!] || 0} × {metric.base_rate}% = {calculateBonus(metric, values[metric.id!] || 0).toFixed(2)} ₽
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {hasTieredMetrics && (
            <div className="space-y-2">
              {filteredMetrics
                .filter(({ metric }) => metric.type === 'tiered')
                .map(({ metric }) => (
                  <div key={metric.id} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <div className="font-medium">{metric.name}</div>
                      {/* <div className="text-sm text-muted-foreground">
                        {metric.description}
                      </div> */}
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={values[metric.id!] || ''}
                          onChange={(e) => handleValueChange(metric.id!, e.target.value)}
                          className="pr-8"
                        />
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="text-sm flex items-center gap-2">
                        <span className="font-medium">
                          {calculateBonus(metric, values[metric.id!] || 0).toFixed(2)} ₽
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {values[metric.id!] || 0} × {calculateBonus(metric, values[metric.id!] || 0) / (values[metric.id!] || 1)} ₽
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{getTierDescription(metric, values[metric.id!] || 0)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get tier description for display
function getTierDescription(metric: KpiMetric, value: number): string {
  if (metric.type !== 'tiered' || !metric.tiers?.length) return '';

  const tier = metric.tiers.find(
    (t) =>
      value >= t.min_value &&
      (t.max_value === null || value <= t.max_value)
  );

  if (!tier) return 'Вне диапазона';

  return `${tier.min_value}${tier.max_value !== null ? `-${tier.max_value}` : '+'} ${metric.name} × ${tier.rate} ₽`;
}
