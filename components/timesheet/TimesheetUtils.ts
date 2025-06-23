import { format, isSameDay, parseISO } from 'date-fns';
import { type VacationRequest } from '@/lib/supabase/types';

// Define the day status type
export type DayStatus = 'work' | 'sick' | 'unpaid' | 'vacation' | null;

// Map status to display text and labels
export const statusConfig = {
  'work': { 
    text: '8', 
    label: 'Рабочий день (8ч)', 
    class: 'bg-green-100 dark:bg-green-900/60 border-green-300 dark:border-green-800' 
  },
  'sick': { 
    text: 'Б', 
    label: 'Больничный', 
    class: 'bg-blue-100 dark:bg-blue-900/60 border-blue-300 dark:border-blue-800' 
  },
  'unpaid': { 
    text: 'A', 
    label: 'За свой счет', 
    class: 'bg-yellow-100 dark:bg-yellow-900/60 border-yellow-300 dark:border-yellow-800' 
  },
  'vacation': { 
    text: 'O', 
    label: 'Отпуск', 
    class: 'bg-purple-100 dark:bg-purple-900/60 border-purple-300 dark:border-purple-800' 
  },
  'weekend': { 
    text: 'В', 
    label: 'Выходной', 
    class: 'bg-gray-100 dark:bg-gray-800/60 border-gray-300 dark:border-gray-700 text-gray-400' 
  },
} as const;

// Russian holidays for 2024-2025 (add more as needed)
export const HOLIDAYS = [
  '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08',
  '2024-02-23', '2024-03-08', '2024-05-01', '2024-05-09', '2024-06-12', '2024-11-04',
  '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-06', '2025-01-07', '2025-01-08',
  '2025-02-24', '2025-03-10', '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04'
];

// Days before holidays that are shortened
export const PRE_HOLIDAYS = [
  '2024-02-22', '2024-03-07', '2024-04-30', '2024-05-08', '2024-05-10', '2024-11-01',
  '2025-02-21', '2025-03-07', '2025-04-30', '2025-05-08', '2025-06-11', '2025-12-31'
];

// Check if a date is a weekend in Russia (Saturday or Sunday)
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

// Check if a date is a holiday
export const isHoliday = (date: Date): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return HOLIDAYS.includes(dateStr);
};

// Check if a date is a pre-holiday (shortened working day)
export const isPreHoliday = (date: Date): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return PRE_HOLIDAYS.includes(dateStr);
};

// Check if a date is after an employee's termination date
// The termination date itself is considered a working day
export const isAfterTermination = (date: Date, terminationDate: string | null | undefined): boolean => {
  if (!terminationDate) return false;
  const termDate = new Date(terminationDate);
  // Compare dates without time components
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  termDate.setHours(0, 0, 0, 0);
  return compareDate > termDate;
};

// Get default status for a date
export const getDefaultStatus = (date: Date): DayStatus => {
  if (isHoliday(date)) return null; // No default status for holidays
  if (isPreHoliday(date)) return 'work'; // Default to work for pre-holidays
  return 'work'; // Default to work for regular weekdays (weekends will be handled separately)
};

// Get status symbol for display
export const getStatusSymbol = (status: DayStatus, date: Date, isAfterTermination: boolean = false): string => {
  if (isAfterTermination) return 'X';
  if (!status) {
    // Show weekend indicator if no status is set and it's a weekend
    return isWeekend(date) ? statusConfig['weekend'].text : '';
  }
  return statusConfig[status]?.text || status;
};

// Get status label for tooltip
export const getStatusLabel = (status: DayStatus, date: Date, isAfterTermination: boolean = false): string => {
  if (isAfterTermination) return 'После увольнения';
  if (!status) {
    return isWeekend(date) ? statusConfig['weekend'].label : '';
  }
  return statusConfig[status]?.label || '';
};

// Get status CSS class
export const getStatusClass = (status: DayStatus, date: Date, isAfterTermination: boolean = false): string => {
  if (isAfterTermination) return 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed';
  if (!status) {
    return isWeekend(date) ? statusConfig['weekend'].class : '';
  }
  return statusConfig[status]?.class || '';
};

// Calculate working hours for a day based on status
export const getWorkingHours = (status: DayStatus, date: Date): number => {
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

// Check if a date is within a vacation period
export const isDateInVacationPeriod = (date: Date, vacations: VacationRequest[]): boolean => {
  return vacations.some(vacation => {
    const start = parseISO(vacation.start_date);
    const end = parseISO(vacation.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  });
};

// Define types for our components
export interface TimesheetDay {
  date: Date;
  status: DayStatus;
  isDayOff?: boolean;
}

export interface TimesheetEntry {
  id?: number;
  employee_id: number;
  work_date: string;
  status: 'work' | 'sick' | 'unpaid' | 'vacation';
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: number;
  name: string;
  position: string;
  termination_date?: string | null;
  days: TimesheetDay[];
  vacations?: VacationRequest[];
}
