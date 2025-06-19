import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInMonths, differenceInDays, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency in BYN format
 * @param value - Number to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-BY', {
    style: 'currency',
    currency: 'BYN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Calculate accrued vacation days based on hire date
 * @param hireDate - Employee's hire date in ISO format
 * @param daysPerYear - Number of vacation days per year (default: 28)
 * @param currentDate - Reference date for calculation (default: current date)
 * @returns Number of accrued vacation days
 */
export function calculateAccruedVacationDays(
  hireDate: string,
  daysPerYear: number = 24,
  currentDate: Date = new Date()
): number {
  const hireDateTime = parseISO(hireDate)
  
  // Calculate months worked
  const monthsWorked = differenceInMonths(currentDate, hireDateTime)
  
  // Calculate days accrued (proportional to time worked)
  const daysAccruedPerMonth = daysPerYear / 12
  let accruedDays = monthsWorked * daysAccruedPerMonth
  
  // Handle partial months
  const lastFullMonth = new Date(currentDate)
  lastFullMonth.setMonth(lastFullMonth.getMonth() - (monthsWorked % 12))
  const daysInPartialMonth = differenceInDays(currentDate, lastFullMonth)
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const partialMonthAccrual = (daysInPartialMonth / daysInMonth) * daysAccruedPerMonth
  
  // Add partial month accrual
  accruedDays += partialMonthAccrual
  
  // Round to 1 decimal place
  return Math.round(accruedDays * 10) / 10
}
