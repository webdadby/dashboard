'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Filter, Loader2 } from 'lucide-react';
import { KpiMetric, Employee } from './KpiTypes';
import { createClient } from '@/lib/supabase/client';
import { kpiMetricsApi, employeeMetricsApi } from '@/lib/supabase/kpi';
import { useToast } from '@/components/ui/use-toast';
import { MetricForm } from './MetricForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

const supabase = createClient();

interface MetricsListProps {
  metrics: KpiMetric[];
  onRefresh: () => void;
}

const getMetricTypeLabel = (type: string) => {
  switch (type) {
    case 'tiered':
      return 'Диапазонные ставки';
    case 'multiply':
      return 'Умножение на ставку';
    case 'percentage':
      return 'Процент выполнения';
    default:
      return type;
  }
};

export const MetricsList: React.FC<MetricsListProps> = ({ metrics, onRefresh }) => {
  const [editingMetric, setEditingMetric] = useState<KpiMetric | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeAssignments, setEmployeeAssignments] = useState<Record<number, Employee[]>>({});
  const { toast } = useToast();
  
  // Load all employees and their assignments
  useEffect(() => {
    async function loadData() {
      try {
        // Load all employees
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .order('name', { ascending: true });
          
        if (employeesError) throw employeesError;
        setEmployees(employeesData || []);
        
        // Load employee assignments for all metrics
        const assignments: Record<number, Employee[]> = {};
        
        for (const metric of metrics) {
          try {
            const assignedEmployees = await employeeMetricsApi.getEmployeesForMetric(metric.id!);
            assignments[metric.id!] = assignedEmployees;
          } catch (error) {
            console.error(`Error loading assignments for metric ${metric.id}:`, error);
            assignments[metric.id!] = [];
          }
        }
        
        setEmployeeAssignments(assignments);
      } catch (error) {
        console.error('Error loading employee data:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить данные о сотрудниках',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [metrics, toast]);
  
  // Filter metrics based on selected employees
  const filteredMetrics = metrics.filter(metric => {
    if (selectedEmployees.length === 0) return true;
    const assignedEmployeeIds = employeeAssignments[metric.id!]?.map(e => e.id) || [];
    return selectedEmployees.some(id => assignedEmployeeIds.includes(id));
  });
  
  const handleEmployeeToggle = (employeeId: number) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };
  
  const clearFilters = () => {
    setSelectedEmployees([]);
  };

  const handleDelete = async (id: number) => {
    try {
      await kpiMetricsApi.delete(id);
      toast({
        title: 'Успех',
        description: 'Метрика успешно удалена',
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting metric:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить метрику',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteConfirmOpen(null);
    }
  };

  const handleSave = () => {
    setEditingMetric(null);
    onRefresh();
  };

  if (editingMetric) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          {editingMetric.id ? 'Редактировать метрику' : 'Создать новую метрику'}
        </h3>
        <MetricForm 
          metric={editingMetric} 
          onSave={handleSave} 
          onCancel={() => setEditingMetric(null)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Метрики KPI</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <Filter className="h-4 w-4 mr-2" />
                {selectedEmployees.length > 0 
                  ? `Выбрано: ${selectedEmployees.length}` 
                  : 'Фильтр по сотрудникам'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-2 border-b">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Сотрудники</h4>
                  {selectedEmployees.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilters();
                      }}
                    >
                      Сбросить
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-60">
                <div className="p-2 space-y-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => handleEmployeeToggle(employee.id)}
                      />
                      <label
                        htmlFor={`employee-${employee.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center space-x-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={employee.avatar_url || ''} alt={employee.name} />
                          <AvatarFallback>
                            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{employee.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button 
            onClick={() => setEditingMetric({ 
              name: '', 
              type: 'tiered', 
              description: '',
              employee_ids: [] 
            } as KpiMetric)}
          >
            Создать метрику
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Назначено</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Загрузка метрик...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredMetrics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                  {selectedEmployees.length > 0 
                    ? 'Нет метрик, соответствующих выбранным фильтрам'
                    : 'Нет созданных метрик'}
                </TableCell>
              </TableRow>
            ) : (
              filteredMetrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getMetricTypeLabel(metric.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {employeeAssignments[metric.id!]?.slice(0, 3).map(employee => (
                        <Avatar key={employee.id} className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={employee.avatar_url || ''} alt={employee.name} />
                          <AvatarFallback className="text-xs">
                            {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {employeeAssignments[metric.id!]?.length > 3 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                          +{employeeAssignments[metric.id!].length - 3}
                        </div>
                      )}
                      {(!employeeAssignments[metric.id!] || employeeAssignments[metric.id!].length === 0) && (
                        <span className="text-muted-foreground text-sm">Не назначено</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {metric.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingMetric(metric)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsDeleteConfirmOpen(metric.id as number)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {isDeleteConfirmOpen === metric.id && (
                      <div className="absolute bg-background p-2 border rounded-md shadow-lg z-10">
                        <p className="text-sm mb-2">Удалить метрику?</p>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDeleteConfirmOpen(null)}
                          >
                            Отмена
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(metric.id as number)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
