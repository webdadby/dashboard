'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { employeesApi, timesheetsApi, vacationsApi, type Employee as DbEmployee, type VacationRequest } from '@/lib/supabase';

type TimesheetEntry = {
  id?: number;
  employee_id: number;
  work_date: string;
  status: 'work' | 'sick' | 'unpaid' | 'vacation';
  created_at?: string;
  updated_at?: string;
};
import { toast } from 'sonner';
import React from 'react';

// Define the API response type
interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

// Extend the DbEmployee type for our component
interface Employee extends Omit<DbEmployee, 'id'> {
  id: number;
  days: TimesheetDay[];
}

type DayStatus = 'work' | 'sick' | 'unpaid' | 'vacation' | null;

// Map status to display text and labels
const statusConfig = {
  'work': { text: '8', label: 'Рабочий день (8ч)', class: 'bg-green-100 dark:bg-green-900/60 border-green-300 dark:border-green-800' },
  'sick': { text: 'Б', label: 'Больничный', class: 'bg-blue-100 dark:bg-blue-900/60 border-blue-300 dark:border-blue-800' },
  'unpaid': { text: 'A', label: 'За свой счет', class: 'bg-yellow-100 dark:bg-yellow-900/60 border-yellow-300 dark:border-yellow-800' },
  'vacation': { text: 'O', label: 'Отпуск', class: 'bg-purple-100 dark:bg-purple-900/60 border-purple-300 dark:border-purple-800' },
  'weekend': { text: 'В', label: 'Выходной', class: 'bg-gray-100 dark:bg-gray-800/60 border-gray-300 dark:border-gray-700 text-gray-400' },
} as const;

// Russian holidays for 2024-2025 (add more as needed)
const HOLIDAYS = [
  '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08',
  '2024-02-23', '2024-03-08', '2024-05-01', '2024-05-09', '2024-06-12', '2024-11-04',
  '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-06', '2025-01-07', '2025-01-08',
  '2025-02-24', '2025-03-10', '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04'
];

// Days before holidays that are shortened
const PRE_HOLIDAYS = [
  '2024-02-22', '2024-03-07', '2024-04-30', '2024-05-08', '2024-05-10', '2024-11-01',
  '2025-02-21', '2025-03-07', '2025-04-30', '2025-05-08', '2025-06-11', '2025-12-31'
];

// Check if a date is a weekend in Russia (Saturday or Sunday)
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

// Check if a date is a holiday
const isHoliday = (date: Date): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return HOLIDAYS.includes(dateStr);
};

// Check if a date is a pre-holiday (shortened working day)
const isPreHoliday = (date: Date): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return PRE_HOLIDAYS.includes(dateStr);
};

// Check if a date is after an employee's termination date
// The termination date itself is considered a working day
const isAfterTermination = (date: Date, terminationDate: string | null | undefined): boolean => {
  if (!terminationDate) return false;
  const termDate = new Date(terminationDate);
  // Compare dates without time components
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  termDate.setHours(0, 0, 0, 0);
  return compareDate > termDate;
};

// Get default status for a date
const getDefaultStatus = (date: Date): DayStatus => {
  if (isHoliday(date)) return null; // No default status for holidays
  if (isPreHoliday(date)) return 'work'; // Default to work for pre-holidays
  return 'work'; // Default to work for regular weekdays (weekends will be handled separately)
};

interface TimesheetDay {
  date: Date;
  status: DayStatus;
}

export const TimesheetTable: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheetData, setTimesheetData] = useState<TimesheetEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch employees, timesheet data, and vacation requests when component mounts or month changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch employees and timesheet data in parallel
        const [employees, timesheetResponse] = await Promise.all([
          employeesApi.getAll(),
          timesheetsApi.getByMonth(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1
          )
        ]);
        
        // Fetch approved vacation requests for the current month
        const monthStart = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const monthEnd = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );
        
        // Fetch vacation requests with error handling
        let vacationRequests: VacationRequest[] = [];
        try {
          const response = await vacationsApi.getAllRequests({
            startDate: format(monthStart, 'yyyy-MM-dd'),
            endDate: format(monthEnd, 'yyyy-MM-dd'),
            status: 'approved'
          });
          vacationRequests = Array.isArray(response) ? response : [];
          console.log('Fetched vacation requests:', vacationRequests);
        } catch (err) {
          console.error('Error fetching vacation requests:', err);
          // Continue with empty array if there's an error
        }
        
        // Filter employees based on termination date
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Initialize employees with empty days array and vacation requests
        const employeesWithDays: Employee[] = employees
          .filter(emp => {
            // Include employee if:
            // 1. They don't have a termination date, OR
            // 2. Their termination date is in the current month or later
            if (!emp.termination_date) return true;
            
            const terminationDate = new Date(emp.termination_date);
            return terminationDate >= currentMonthStart && terminationDate <= currentMonthEnd ||
                   terminationDate > currentMonthEnd;
          })
          .map((emp) => {
            // Filter vacation requests for this employee
            const employeeVacations = vacationRequests.filter(
              (req) => req.employee_id === emp.id
            );
            
            return {
              ...emp,
              days: [],
              vacations: employeeVacations
            };
          });
        
        setEmployees(employeesWithDays);
        setTimesheetData(timesheetResponse || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Не удалось загрузить данные. Пожалуйста, обновите страницу.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentDate]); // Add currentDate to dependency array to refetch when month changes

  // Generate days for the current month
  const daysInMonth = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

  // Initialize or update days for employees
  useEffect(() => {
    if (employees.length === 0) return;

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    console.log('Initializing days for month:', format(monthStart, 'yyyy-MM'), 'to', format(monthEnd, 'yyyy-MM-dd'));

    const updatedEmployees = employees.map(employee => {
      // Get all vacation periods for this employee
      const vacationPeriods = (employee as any).vacations?.map((vacation: VacationRequest) => ({
        start: parseISO(vacation.start_date),
        end: parseISO(vacation.end_date)
      })) || [];

      const days = daysInMonth.map(date => {
        // Check if the date is within any vacation period
        const isOnVacation = vacationPeriods.some(
          (period: { start: Date, end: Date }) => {
            const start = new Date(period.start);
            const end = new Date(period.end);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
          }
        );
        
        // If it's a vacation day, set status to 'vacation'
        if (isOnVacation) {
          console.log('Vacation day found:', {
            employeeId: employee.id,
            date: format(date, 'yyyy-MM-dd'),
            vacationPeriods: vacationPeriods.map((period: { start: Date; end: Date }) => ({
              start: format(period.start, 'yyyy-MM-dd'),
              end: format(period.end, 'yyyy-MM-dd')
            }))
          });
          return {
            date,
            status: 'vacation' as const,
            isDayOff: false
          };
        }
        
        // Check if the date is a weekend or holiday
        const isDayOff = isWeekend(date) || isHoliday(date);
        
        // Get default status for the day
        let status: DayStatus = isDayOff ? null : getDefaultStatus(date);
        
        // Check if there's an existing timesheet entry for this date
        const existingEntry = timesheetData.find(
          (entry: TimesheetEntry) => 
            entry.employee_id === employee.id && 
            isSameDay(parseISO(entry.work_date), date)
        );
        
        if (existingEntry) {
          status = existingEntry.status as DayStatus;
        }
        
        return {
          date,
          status,
          isDayOff
        };
      });

      return {
        ...employee,
        days,
        vacations: (employee as any).vacations || []
      };
    });

    setEmployees(updatedEmployees);
  }, [currentDate, timesheetData]);

  const getStatusSymbol = (status: DayStatus, date: Date, isAfterTermination: boolean = false): string => {
    if (isAfterTermination) return 'X';
    if (!status) {
      // Show weekend indicator if no status is set and it's a weekend
      return isWeekend(date) ? statusConfig['weekend'].text : '';
    }
    return statusConfig[status]?.text || status;
  };

  const getStatusLabel = (status: DayStatus, date: Date, isAfterTermination: boolean = false): string => {
    if (isAfterTermination) return 'После увольнения';
    if (!status) {
      return isWeekend(date) ? statusConfig['weekend'].label : '';
    }
    return statusConfig[status]?.label || '';
  };

  const getStatusClass = (status: DayStatus, date: Date, isAfterTermination: boolean = false): string => {
    if (isAfterTermination) return 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed';
    if (!status) {
      return isWeekend(date) ? statusConfig['weekend'].class : '';
    }
    return statusConfig[status]?.class || '';
  };

  // Calculate working hours for a day based on status
  const getWorkingHours = (status: DayStatus, date: Date): number => {
    if (!status) return 0;
    
    switch (status) {
      case 'work':
        return isPreHoliday(date) ? 7 : 8; // 7 hours on pre-holidays, 8 otherwise
      case 'sick':
      case 'vacation':
      case 'unpaid':
        return 8; // Full day for these statuses
      default:
        return 0;
    }
  };

  // Calculate totals for an employee - only working days and hours
  const calculateTotals = (employee: Employee) => {
    let workingDays = 0;
    let workingHours = 0;

    employee.days.forEach(day => {
      // Skip days after termination
      if (employee.termination_date && isAfterTermination(day.date, employee.termination_date)) {
        return;
      }
      
      // Only count work days (status 'work')
      if (day.status === 'work') {
        workingDays++;
        workingHours += getWorkingHours(day.status, day.date);
      }
    });

    return { workingDays, workingHours };
  };

  const toggleDayStatus = (employeeId: number, date: Date, disabled: boolean = false) => {
    if (disabled) return;
    
    setEmployees(prevEmployees =>
      prevEmployees.map(emp => {
        if (emp.id !== employeeId) return emp;

        const dayIndex = emp.days.findIndex(d => isSameDay(d.date, date));
        const dayExists = dayIndex !== -1;
        const currentStatus = dayExists ? emp.days[dayIndex].status : getDefaultStatus(date);

        // Define the status cycle order
        const statusOrder: DayStatus[] = ['work', 'sick', 'unpaid', 'vacation', null];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        const nextStatus = statusOrder[nextIndex];

        const updatedDay = { date, status: nextStatus };

        return {
          ...emp,
          days: dayExists
            ? emp.days.map((d, i) => (i === dayIndex ? updatedDay : d))
            : [...emp.days, updatedDay].sort((a, b) => a.date.getTime() - b.date.getTime())
        };
      })
    );
  };



  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Prepare timesheet entries for all employees
      const entries = employees.flatMap(employee => 
        employee.days
          .filter(day => {
            // Skip entries with null status (weekends/holidays)
            if (day.status === null) return false;
            
            // Skip days after termination
            if (employee.termination_date && isAfterTermination(day.date, employee.termination_date)) {
              return false;
            }
            
            return true;
          })
          .map(day => {
            const workDate = format(day.date, 'yyyy-MM-dd');
            return {
              employee_id: employee.id,
              work_date: workDate,
              status: day.status as 'work' | 'sick' | 'unpaid' | 'vacation',
            };
          })
      );

      if (entries.length === 0) {
        toast.info('Нет данных для сохранения');
        return;
      }

      console.log('Saving timesheet entries:', entries);
      
      // Save entries to the database
      const result = await timesheetsApi.bulkUpsert(entries);
      
      // Show success message with the number of saved entries
      toast.success(`Успешно сохранено ${result.length} записей в табеле`);
      console.log('Successfully saved timesheet entries:', result);
      
      // Refresh timesheet data
      const timesheetResponse = await timesheetsApi.getByMonth(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );
      setTimesheetData(timesheetResponse || []);
      
      return result;
    } catch (error) {
      console.error('Error saving timesheet:', error);
      let errorMessage = 'Неизвестная ошибка при сохранении табеля';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific Supabase errors
        if ('code' in error) {
          switch ((error as any).code) {
            case '23505':
              errorMessage = 'Ошибка: дублирующаяся запись';
              break;
            case '42501':
              errorMessage = 'Ошибка прав доступа. Убедитесь, что у вас есть необходимые разрешения.';
              break;
            case '42P01':
              errorMessage = 'Ошибка: таблица timesheets не существует';
              break;
          }
        }
      }
      
      toast.error(`Ошибка при сохранении табеля: ${errorMessage}`);
      throw error; // Re-throw to allow calling code to handle if needed
    } finally {
      setIsSaving(false);
    }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">
        Произошла ошибка при загрузке данных: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            disabled={isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isLoading || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            'Сохранить'
          )}
        </Button>
      </div>

      <Card className="w-full overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Сотрудник</TableHead>
                  {daysInMonth.map((day) => (
                    <TableHead key={day.toString()} className="text-center p-0">
                      <div className="flex flex-col items-center justify-center p-0.5">
                        <div className="text-xs font-medium">
                          {format(day, 'd', { locale: ru })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(day, 'EE', { locale: ru }).charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-medium p-1.5 text-sm">Дней</TableHead>
                  <TableHead className="text-center font-medium p-1.5 text-sm">Часов</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className="h-8">
                    <TableCell className="font-medium p-1.5">
                      <div className="leading-tight">
                        <div className="text-sm">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.position}
                        </div>
                      </div>
                    </TableCell>
                    {daysInMonth.map((date) => {
                      const dayStatus = employee.days.find((d) => isSameDay(d.date, date))?.status || null;
                      const isTerminated = !!(employee.termination_date && isAfterTermination(date, employee.termination_date));
                      
                      return (
                        <TableCell
                          key={date.toString()}
                          className={`text-center p-0 ${
                            isTerminated ? '' : 'cursor-pointer hover:bg-muted/50'
                          }`}
                          onClick={() => toggleDayStatus(employee.id, date, isTerminated)}
                          title={isTerminated 
                            ? 'После увольнения' 
                            : getStatusLabel(dayStatus, date) || (isWeekend(date) ? 'Выходной' : '')
                          }
                        >
                          <div className={`w-full h-full flex items-center justify-center p-0.5 border text-sm ${
                            getStatusClass(dayStatus, date, isTerminated)
                          } ${!dayStatus && isWeekend(date) && !isTerminated ? 'text-muted-foreground/50' : ''}`}>
                            {isTerminated ? 'X' : getStatusSymbol(dayStatus, date)}
                          </div>
                        </TableCell>
                      );
                    })}
                    {/* Totals columns */}
                    <TableCell className="text-center font-medium border-l-2 p-1.5">
                      <div className="text-sm">{calculateTotals(employee).workingDays}</div>
                    </TableCell>
                    <TableCell className="text-center font-medium p-1.5">
                      <div className="text-sm">{calculateTotals(employee).workingHours}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {Object.entries(statusConfig).map(([status, { text, label, class: className }]) => (
          <div key={status} className="flex items-center">
            <div className={`w-3 h-3 rounded-sm border mr-2 ${className.split(' ')[0]} ${className.split(' ')[1] || ''}`} />
            <span className="text-muted-foreground text-sm">{text} - {label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
