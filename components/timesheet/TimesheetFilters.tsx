'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Employee } from './TimesheetUtils';

export interface TimesheetFiltersProps {
  employees: Employee[];
  onFilterChange: (filteredEmployees: Employee[]) => void;
}

export const TimesheetFilters: React.FC<TimesheetFiltersProps> = ({
  employees,
  onFilterChange
}) => {
  const [nameFilter, setNameFilter] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'terminated'>('all');
  
  // Получаем уникальные должности для выпадающего списка
  const uniquePositions = Array.from(new Set(employees.map(emp => emp.position)))
    .sort((a, b) => a.localeCompare(b));
  
  // Функция применения фильтров
  const applyFilters = () => {
    const filtered = employees.filter(employee => {
      // Фильтр по имени
      const nameMatch = nameFilter === '' || 
        employee.name.toLowerCase().includes(nameFilter.toLowerCase());
      
      // Фильтр по должности
      const positionMatch = positionFilter === 'all' || 
        employee.position === positionFilter;
      
      // Фильтр по статусу
      let statusMatch = true;
      if (statusFilter === 'active') {
        statusMatch = !employee.termination_date;
      } else if (statusFilter === 'terminated') {
        statusMatch = !!employee.termination_date;
      }
      
      return nameMatch && positionMatch && statusMatch;
    });
    
    onFilterChange(filtered);
  };
  
  // Сбросить все фильтры
  const resetFilters = () => {
    setNameFilter('');
    setPositionFilter('all');
    setStatusFilter('all');
    onFilterChange(employees);
  };
  
  return (
    <div className="bg-card rounded-md p-4 mb-4 space-y-4">
      <h3 className="text-lg font-medium">Фильтры</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Фильтр по имени */}
        <div className="space-y-2">
          <label htmlFor="name-filter" className="text-sm font-medium">
            Имя сотрудника
          </label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="name-filter"
              placeholder="Поиск по имени"
              className="pl-8"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
        </div>
        
        {/* Фильтр по должности */}
        <div className="space-y-2">
          <label htmlFor="position-filter" className="text-sm font-medium">
            Должность
          </label>
          <Select
            value={positionFilter || "all"}
            onValueChange={setPositionFilter}
          >
            <SelectTrigger id="position-filter">
              <SelectValue placeholder="Все должности" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все должности</SelectItem>
              {uniquePositions.map((position) => (
                <SelectItem key={position} value={position}>
                  {position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Фильтр по статусу */}
        <div className="space-y-2">
          <label htmlFor="status-filter" className="text-sm font-medium">
            Статус
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value: 'all' | 'active' | 'terminated') => setStatusFilter(value)}
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Все сотрудники" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="terminated">Уволенные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={resetFilters} className="flex items-center">
          <X className="mr-1 h-4 w-4" />
          Сбросить
        </Button>
        <Button onClick={applyFilters}>Применить</Button>
      </div>
    </div>
  );
};
