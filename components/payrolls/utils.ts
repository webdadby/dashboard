import { WorkNorm } from '@/lib/supabase/types';

// Округление числа до 2 знаков после запятой
const roundToTwoDecimals = (value: number) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

// Return rounded number value
const formatCurrency = (value: number) => {
  return roundToTwoDecimals(value);
};

// Calculate salary based on worked hours and work norm
const calculateSalaryAccrued = (
  employeeRate: number,
  minSalary: number,
  workedHours: number,
  normHours: number
) => {
  if (!normHours) return 0;
  const fullSalary = employeeRate * minSalary;
  return (fullSalary / normHours) * workedHours;
};

// Calculate income tax
const calculateIncomeTax = (totalAccrued: number, incomeTaxRate: number) => {
  return totalAccrued * (incomeTaxRate / 100);
};

// Calculate pension tax (1% of total accrued)
const calculatePensionTax = (totalAccrued: number) => {
  return totalAccrued * 0.01;
};

// Get month options for select
const getMonths = () => {
  return [
    { value: 1, label: 'Январь' },
    { value: 2, label: 'Февраль' },
    { value: 3, label: 'Март' },
    { value: 4, label: 'Апрель' },
    { value: 5, label: 'Май' },
    { value: 6, label: 'Июнь' },
    { value: 7, label: 'Июль' },
    { value: 8, label: 'Август' },
    { value: 9, label: 'Сентябрь' },
    { value: 10, label: 'Октябрь' },
    { value: 11, label: 'Ноябрь' },
    { value: 12, label: 'Декабрь' },
  ];
};

// Get year options for select (current year and previous 5 years)
const getYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => currentYear - i);
};

export {
  roundToTwoDecimals,
  formatCurrency,
  calculateSalaryAccrued,
  calculateIncomeTax,
  calculatePensionTax,
  getMonths,
  getYears,
};
