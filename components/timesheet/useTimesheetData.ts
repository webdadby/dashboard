import { useState, useEffect, useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { employeesApi } from '@/lib/supabase/employees';
import { timesheetsApi } from '@/lib/supabase/timesheets';
import { vacationsApi } from '@/lib/supabase/vacations';
import { toast } from 'sonner';
import { type VacationRequest } from '@/lib/supabase/types';
import {
  Employee,
  TimesheetEntry,
  TimesheetDay,
  isWeekend,
  isHoliday,
  isPreHoliday,
  isAfterTermination,
  getDefaultStatus,
  isDateInVacationPeriod
} from './TimesheetUtils';

interface UseTimesheetDataProps {
  initialDate?: Date;
}

interface UseTimesheetDataReturn {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  employees: Employee[];
  daysInMonth: Date[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  handleSave: () => Promise<any>;
  toggleDayStatus: (employeeId: number, date: Date, disabled?: boolean) => void;
  calculateTotals: (employee: Employee) => { workingDays: number; workingHours: number };
}

export function useTimesheetData({ initialDate = new Date() }: UseTimesheetDataProps = {}): UseTimesheetDataReturn {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheetData, setTimesheetData] = useState<TimesheetEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate days for the current month
  const daysInMonth = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

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
  }, [currentDate]);

  // Initialize or update days for employees
  useEffect(() => {
    if (employees.length === 0) return;

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    console.log('Initializing days for month:', format(monthStart, 'yyyy-MM'), 'to', format(monthEnd, 'yyyy-MM-dd'));

    const updatedEmployees = employees.map(employee => {
      const days = daysInMonth.map(date => {
        // Check if the date is within any vacation period
        const isOnVacation = isDateInVacationPeriod(date, employee.vacations || []);
        
        // If it's a vacation day, set status to 'vacation'
        if (isOnVacation) {
          return {
            date,
            status: 'vacation' as const,
            isDayOff: false
          };
        }
        
        // Check if the date is a weekend or holiday
        const isDayOff = isWeekend(date) || isHoliday(date);
        
        // Get default status for the day
        let status = isDayOff ? null : getDefaultStatus(date);
        
        // Check if there's an existing timesheet entry for this date
        const existingEntry = timesheetData.find(
          (entry: TimesheetEntry) => 
            entry.employee_id === employee.id && 
            isSameDay(parseISO(entry.work_date), date)
        );
        
        if (existingEntry) {
          status = existingEntry.status as any;
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
      };
    });

    setEmployees(updatedEmployees);
  }, [currentDate, timesheetData]);

  // Toggle day status for an employee
  const toggleDayStatus = (employeeId: number, date: Date, disabled: boolean = false) => {
    if (disabled) return;
    
    setEmployees(prevEmployees =>
      prevEmployees.map(emp => {
        if (emp.id !== employeeId) return emp;

        const dayIndex = emp.days.findIndex(d => isSameDay(d.date, date));
        const dayExists = dayIndex !== -1;
        const currentStatus = dayExists ? emp.days[dayIndex].status : getDefaultStatus(date);

        // Define the status cycle order
        const statusOrder: ('work' | 'sick' | 'unpaid' | 'vacation' | null)[] = ['work', 'sick', 'unpaid', 'vacation', null];
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
        // Calculate hours based on pre-holiday status
        workingHours += day.date && isPreHoliday(day.date) ? 7 : 8;
      }
    });

    return { workingDays, workingHours };
  };

  // Save timesheet data
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
        return [];
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

  return {
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
  };
}
