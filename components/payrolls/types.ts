import type { Employee, Payroll, PayrollWithEmployee, WorkNorm } from '@/lib/supabase/types';

export type { Employee, Payroll, PayrollWithEmployee, WorkNorm };

export interface PayrollCalculations {
  baseSalary: number;
  bonus: number;
  extraPay: number;
  vacationPayCurrent: number;
  vacationPayNext: number;
  sickLeavePayment: number;
  advancePayment: number;
  otherDeductions: number;
  totalAccrued: number;
  incomeTax: number;
  pensionTax: number;
  fsznTax: number;
  insuranceTax: number;
  totalDeductions: number;
  totalPayable: number;
  payableWithoutSalary: number;
  totalEmployeeCost: number;
  isTaxBenefitApplied: boolean;
}

export interface PayrollFormValues {
  worked_days: number | null;
  bonus: number | null;
  extra_pay: number | null;
  vacation_pay_current: number | null;
  vacation_pay_next: number | null;
  sick_leave_payment: number | null;
  advance_payment: number | null;
  other_deductions: number | null;
  payment_date: string | null;
}

export interface PayrollFormSubmitData {
  worked_days: number;
  bonus: number;
  extra_pay: number;
  vacation_pay_current: number;
  vacation_pay_next: number;
  sick_leave_payment: number;
  advance_payment: number;
  other_deductions: number;
  payment_date: string | null;
  employee_id: string;
  year: number;
  month: number;
}

export interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee & { salary: number; year: number; month: number };
  payroll: Payroll | undefined;
  workNorm: WorkNorm | null;
  year: number;
  month: number;
  minSalary: number;
  incomeTaxRate: number;
  fsznRate: number;
  insuranceRate: number;
  benefitAmount: number;
  taxDeduction: number;
  onSave: (payroll: PayrollFormSubmitData) => void;
}

export interface EditWorkNormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workNorm: WorkNorm | null;
  year: number;
  month: number;
  onSave: (normHours: number) => Promise<void>;
}

export interface PayrollsTableProps {
  employees: Employee[];
  payrolls: PayrollWithEmployee[];
  workNorm: WorkNorm | null;
  minSalary: number;
  incomeTaxRate: number;
  onEditPayroll: (employee: Employee) => void;
}

export interface PayrollRowProps {
  employee: Employee;
  payroll: PayrollWithEmployee | undefined;
  workNorm: WorkNorm | null;
  minSalary: number;
  incomeTaxRate: number;
  onEdit: (employee: Employee) => void;
}

export interface MonthYearSelectorProps {
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}
