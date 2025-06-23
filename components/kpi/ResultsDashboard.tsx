'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { EmployeeKpiCard } from './EmployeeKpiCard';
import { KpiMetric, Employee } from './KpiTypes';
import { useState, useMemo } from 'react';
import { format, subMonths, addMonths, formatISO, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ResultsDashboardProps {
  employees: Employee[];
  metrics: KpiMetric[];
  onSave: (employeeId: number, results: Array<{ metricId: number; value: number }>, period: string) => Promise<void>;
  isSaving: boolean;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  employees,
  metrics,
  onSave,
  isSaving,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Generate 6 months period (current month + 5 previous months)
  const months = useMemo(() => {
    const result = [];
    const date = new Date(currentDate);
    
    // Set to first day of the month for consistent comparison
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(date);
      monthDate.setMonth(date.getMonth() - i);
      
      const monthKey = format(monthDate, 'yyyy-MM-01');
      const monthName = format(monthDate, 'LLLL yyyy', { locale: ru });
      
      // Capitalize first letter
      const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      result.push({
        date: monthDate,
        key: monthKey,
        name: formattedMonthName,
        isCurrent: i === 0
      });
    }
    
    return result;
  }, [currentDate]);

  // Toggle month expansion
  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Extract unique departments
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) {
        deptSet.add(emp.department);
      }
    });
    return Array.from(deptSet).sort();
  }, [employees]);

  // Group employees by department
  const employeesByDepartment = useMemo(() => {
    const result: Record<string, Employee[]> = {};
    
    employees.forEach(employee => {
      const department = employee.department || 'Без отдела';
      if (!result[department]) {
        result[department] = [];
      }
      result[department].push(employee);
    });
    
    // Sort departments alphabetically
    return Object.keys(result)
      .sort()
      .reduce((obj, key) => {
        // Sort employees by name within each department
        obj[key] = [...result[key]].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        return obj;
      }, {} as Record<string, Employee[]>);
  }, [employees]);

  // Filter employees based on search and department filters
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        searchTerm === '' || 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = 
        selectedDepartments.length === 0 || 
        (employee.department && selectedDepartments.includes(employee.department));
      
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, selectedDepartments]);
  
  // Group filtered employees by department
  const filteredEmployeesByDepartment = useMemo(() => {
    const result: Record<string, Employee[]> = {};
    
    filteredEmployees.forEach(employee => {
      const department = employee.department || 'Без отдела';
      if (!result[department]) {
        result[department] = [];
      }
      result[department].push(employee);
    });
    
    // Sort departments alphabetically
    return Object.keys(result)
      .sort()
      .reduce((obj, key) => {
        // Sort employees by name within each department
        obj[key] = [...result[key]].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        return obj;
      }, {} as Record<string, Employee[]>);
  }, [filteredEmployees]);

  const toggleDepartment = (department: string) => {
    setSelectedDepartments(prev => 
      prev.includes(department)
        ? prev.filter(d => d !== department)
        : [...prev, department]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartments([]);
  };

  const hasActiveFilters = searchTerm !== '' || selectedDepartments.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div className="w-full md:w-auto md:flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или должности..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Отделы:</span>
            <div className="flex flex-wrap gap-2">
              {departments.map(dept => (
                <Button
                  key={dept}
                  variant={selectedDepartments.includes(dept) ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => toggleDepartment(dept)}
                >
                  {dept}
                </Button>
              ))}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          Найдено сотрудников: {filteredEmployees.length}
        </div>
      )}

      {filteredEmployees.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? 'Нет сотрудников, соответствующих выбранным фильтрам'
              : 'Нет сотрудников для отображения'}
          </p>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              className="mt-2"
              onClick={clearFilters}
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {months.map((month) => {
            const isExpanded = expandedMonths[month.key] ?? month.isCurrent;
            
            return (
              <div key={month.key} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  onClick={() => toggleMonth(month.key)}
                >
                  <h3 className="text-lg font-semibold">
                    {month.name}
                  </h3>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="p-4 pt-0">
                    {Object.entries(filteredEmployeesByDepartment).map(([department, deptEmployees]) => (
                      <div key={department} className="mb-6">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                          {department}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {deptEmployees.map((employee) => (
                            <div key={employee.id} className="h-full">
                              <EmployeeKpiCard
                                employee={employee}
                                period={month.key}
                                metrics={metrics.map((metric) => ({
                                  metric,
                                  result: undefined, // Will be loaded by the component
                                }))}
                                onSave={(employeeId, results) => onSave(employeeId, results, month.key)}
                                isSaving={isSaving}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
