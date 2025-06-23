import { useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { timesheetsApi } from '@/lib/supabase/timesheets';
import { Employee } from '@/lib/supabase/types';

/**
 * Хук для получения количества отработанных дней из табеля
 */
export function useWorkedDays() {
  const [isLoadingWorkedDays, setIsLoadingWorkedDays] = useState<boolean>(false);

  const fetchWorkedDaysFromTimesheet = useCallback(async (
    employee: Employee,
    year: number,
    month: number
  ): Promise<number> => {
    if (!employee?.id) return 0;
    
    setIsLoadingWorkedDays(true);
    try {
      // Получаем начало и конец месяца
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      
      // Получаем дату увольнения сотрудника, если есть
      const terminationDate = employee.termination_date 
        ? new Date(employee.termination_date) 
        : null;
      
      console.log('Получение данных табеля за период:', { 
        employeeId: employee.id, 
        startDate, 
        endDate,
        terminationDate,
        month,
        year
      });
      
      // Получаем записи табеля за месяц
      const timesheetEntries = await timesheetsApi.getByEmployeeAndDateRange(
        employee.id,
        startDate,
        endDate
      );
      
      console.log('Получены записи табеля:', {
        totalEntries: timesheetEntries.length,
        entries: timesheetEntries.map(e => ({
          id: e.id,
          date: e.work_date,
          status: e.status,
        }))
      });
      
      // Создаем карту для хранения статусов по датам (с приоритетом 'work')
      const dayStatusMap = new Map<string, string>();
      
      // Обрабатываем все записи, сохраняя статус 'work' при его наличии
      timesheetEntries.forEach(entry => {
        const entryDate = new Date(entry.work_date);
        
        // Пропускаем дни после увольнения
        if (terminationDate && entryDate > terminationDate) {
          return;
        }
        
        // Сохраняем статус, если его еще нет или если это 'work'
        if (!dayStatusMap.has(entry.work_date) || entry.status === 'work') {
          dayStatusMap.set(entry.work_date, entry.status);
        }
      });
      
      // Считаем только дни со статусом 'work'
      let workedDays = 0;
      dayStatusMap.forEach((status, date) => {
        if (status === 'work') {
          workedDays++;
        }
      });
      
      console.log('Расчет отработанных дней:', {
        totalDays: dayStatusMap.size,
        workedDays,
        statusDistribution: Array.from(dayStatusMap.entries()).reduce((acc, [date, status]) => {
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        terminationDate: terminationDate?.toISOString()
      });
      
      console.log(`Найдено ${workedDays} отработанных дней в табеле за ${month}.${year}`);
      return workedDays;
    } catch (error) {
      console.error('Error fetching timesheet data:', error);
      return 0;
    } finally {
      setIsLoadingWorkedDays(false);
    }
  }, []);

  return { fetchWorkedDaysFromTimesheet, isLoadingWorkedDays };
}
