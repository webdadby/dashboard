import type { Employee, Payroll, PayrollWithEmployee, WorkNorm } from '@/lib/supabase';

export type { Employee, Payroll, PayrollWithEmployee, WorkNorm };

export interface PayrollFormValues {
  worked_hours: number | null;
  bonus: number;
  extra_pay: number;
  advance_payment: number;
  other_deductions: number;
}

export interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  payroll: Payroll | undefined;
  workNorm: WorkNorm | null;
  year: number;
  month: number;
  minSalary: number;
  incomeTaxRate: number;
  fsznRate: number;
  insuranceRate: number;
  onSave: (payroll: any) => void;
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
