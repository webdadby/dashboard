'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useTimesheetData } from './useTimesheetData';
import { TimesheetHeader } from './TimesheetHeader';
import { TimesheetTableHeader } from './TimesheetTableHeader';
import { TimesheetBody } from './TimesheetBody';
import { TimesheetLegend } from './TimesheetLegend';
import { TimesheetFilters } from './TimesheetFilters';
import { Employee } from './TimesheetUtils';

export const TimesheetContainer: React.FC = () => {
  const {
    currentDate,
    setCurrentDate,
    employees,
    daysInMonth,
    isLoading,
    isSaving,
    error,
    handleSave,
    toggleDayStatus,
    calculateTotals
  } = useTimesheetData();
  
  // Состояние для отфильтрованных сотрудников
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  
  // Инициализация отфильтрованных сотрудников при загрузке или изменении списка сотрудников
  useEffect(() => {
    setFilteredEmployees(employees);
  }, [employees]);

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <p className="font-medium">Ошибка загрузки</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-md border p-4 text-center text-muted-foreground">
        Нет сотрудников для отображения
      </div>
    );
  }

  // Обработчик изменения фильтров
  const handleFilterChange = (filtered: Employee[]) => {
    setFilteredEmployees(filtered);
  };
  
  return (
    <div className="space-y-4">
      <TimesheetHeader
        currentDate={currentDate}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onSave={handleSave}
        isLoading={isLoading}
        isSaving={isSaving}
      />
      
      <TimesheetFilters 
        employees={employees} 
        onFilterChange={handleFilterChange} 
      />

      <Card className="w-full overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TimesheetTableHeader daysInMonth={daysInMonth} />
              <TimesheetBody
                employees={filteredEmployees}
                daysInMonth={daysInMonth}
                toggleDayStatus={toggleDayStatus}
                calculateTotals={calculateTotals}
              />
            </Table>
          </div>
        </CardContent>
      </Card>

      <TimesheetLegend />
    </div>
  );
};
