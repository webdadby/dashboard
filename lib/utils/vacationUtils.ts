import { format, parseISO, isBefore, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { employeesApi } from '@/lib/supabase/employees';
import { vacationsApi } from '@/lib/supabase/vacations';
import { settingsApi } from '@/lib/supabase/settings';
import { payrollsApi } from '@/lib/supabase/payrolls';
import { Payroll } from '@/lib/supabase/types';

/**
 * Checks if a vacation should be paid in the previous month based on salary payment day
 * @param vacationStartDate - Start date of the vacation in ISO format
 * @param salaryPaymentDay - Day of the month when salary is paid (1-31)
 * @param currentDate - Current date for reference (defaults to today)
 * @returns Boolean indicating if vacation should be paid in previous month
 */
export const shouldPayVacationInPreviousMonth = (
  vacationStartDate: string,
  salaryPaymentDay: number,
  currentDate: Date = new Date()
): boolean => {
  try {
    const vacationDate = parseISO(vacationStartDate);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Create a date for the salary payment day in the current month
    const paymentDate = new Date(currentYear, currentMonth, salaryPaymentDay);
    
    // If vacation starts before or on the payment day, it should be paid in previous month
    return isBefore(vacationDate, paymentDate) || format(vacationDate, 'yyyy-MM-dd') === format(paymentDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error in shouldPayVacationInPreviousMonth:', error);
    return false;
  }
};

/**
 * Gets vacation pay for an employee for a specific month
 * @param employeeId - Employee ID
 * @param year - Year to check
 * @param month - Month to check (1-12)
 * @returns Object containing current month and next month vacation pay
 */
export const getEmployeeVacationPay = async (
  employeeId: number,
  year: number,
  month: number
): Promise<{ currentMonth: number; nextMonth: number }> => {
  try {
    // Get salary payment day from settings
    const settings = await settingsApi.get();
    const salaryPaymentDay = settings.salary_payment_date || 5; // Default to 5th if not set
    
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    // Get all approved vacations for the employee
    const allVacations = await vacationsApi.getByStatus('approved');
    const vacations = allVacations.filter((vacation: any) => {
      if (vacation.employee_id !== employeeId) return false;
      
      try {
        const start = parseISO(vacation.start_date);
        const end = parseISO(vacation.end_date);
        return (start >= startDate && start <= endDate) || // starts in range
               (end >= startDate && end <= endDate) ||     // ends in range
               (start <= startDate && end >= endDate);     // spans the entire range
      } catch (error) {
        console.error('Error parsing vacation dates:', error);
        return false;
      }
    });
    
    let currentMonthPay = 0;
    let nextMonthPay = 0;
    
    // Process each vacation
    for (const vacation of vacations) {
      if (shouldPayVacationInPreviousMonth(vacation.start_date, salaryPaymentDay, startDate)) {
        // Add to next month's pay (which is current month in the payroll)
        nextMonthPay += vacation.payment_amount || 0;
      } else {
        // Add to current month's pay
        currentMonthPay += vacation.payment_amount || 0;
      }
    }
    
    return {
      currentMonth: currentMonthPay,
      nextMonth: nextMonthPay
    };
  } catch (error) {
    console.error('Error in getEmployeeVacationPay:', error);
    return { currentMonth: 0, nextMonth: 0 };
  }
};

/**
 * Updates payroll with vacation pay for all employees for a specific month
 * @param year - Year
 * @param month - Month (1-12)
 */
export const updatePayrollsWithVacationPay = async (year: number, month: number): Promise<void> => {
  try {
    // Get all employees
    const employees = await employeesApi.getAll();
    
    // Process each employee
    for (const employee of employees) {
      try {
        // Get vacation pay for the employee
        const { currentMonth, nextMonth } = await getEmployeeVacationPay(employee.id, year, month);
        
        // Get existing payroll for the employee and month
        let existingPayroll = null;
        try {
          const payrolls = await payrollsApi.getByEmployeeYearMonth(employee.id, year, month);
          existingPayroll = Array.isArray(payrolls) && payrolls.length > 0 ? payrolls[0] : null;
        } catch (error) {
          console.error('Error fetching existing payroll:', error);
          existingPayroll = null;
        }
        
        // If there's vacation pay to update
        if (currentMonth > 0 || nextMonth > 0) {
          const basePayrollData: Omit<Payroll, 'id' | 'created_at'> = {
            employee_id: employee.id,
            year,
            month,
            vacation_pay_current: currentMonth,
            vacation_pay_next: nextMonth,
            worked_days: 0,
            bonus: 0,
            extra_pay: 0,
            income_tax: 0,
            pension_tax: 0,
            advance_payment: 0,
            other_deductions: 0,
            total_accrued: 0,
            total_deductions: 0,
            total_payable: 0,
            payable_without_salary: 0,
            fszn_tax: 0,
            insurance_tax: 0,
            total_employee_cost: 0,
            sick_leave_payment: 0
          };
          
          // Create payroll data with existing values or defaults
          const payrollData: Omit<Payroll, 'id' | 'created_at'> = {
            ...basePayrollData,
            ...(existingPayroll || {}),
            vacation_pay_current: currentMonth,
            vacation_pay_next: nextMonth
          };
          
          // Update or create payroll record
          if (existingPayroll?.id) {
            // Update existing payroll with ID
            await payrollsApi.upsert({
              ...payrollData,
              id: existingPayroll.id
            });
          } else {
            // Create new payroll
            await payrollsApi.upsert(payrollData);
          }
        }
      } catch (error) {
        console.error(`Error updating vacation pay for employee ${employee.id}:`, error);
        // Continue with next employee even if one fails
      }
    }
  } catch (error) {
    console.error('Error in updatePayrollsWithVacationPay:', error);
    throw error;
  }
};
