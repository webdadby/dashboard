// Типы данных для работы с сотрудниками в соответствии с таблицей в БД
export type Employee = {
  id: number;
  created_at: string;
  name: string;
  position: string;
  hire_date: string; // в формате ISO для передачи на сервер
  termination_date?: string | null; // в формате ISO, null если сотрудник работает
  rate: number; // ставка (0.25, 0.5, 1)
  base_salary?: number; // оставляем для обратной совместимости
  email?: string | null;
  phone?: string | null;
  tax_identifier?: string | null;
};

// Тип для нормы рабочего времени
export type WorkNorm = {
  id: number;
  year: number;
  month: number;
  norm_hours: number;
  working_days: number; // Number of standard working days in the month
  holiday_days: number; // Number of holiday days in the month that fall on working days
  pre_holiday_days?: number; // Number of pre-holiday working days (typically 1 hour shorter)
};

// Тип для начисления зарплаты
export interface Payroll {
  id: number;
  created_at: string;
  employee_id: number;
  year: number;
  month: number;
  worked_days: number;
  bonus: number;
  extra_pay: number;
  income_tax: number;
  pension_tax: number;
  advance_payment: number;
  other_deductions: number;
  salary?: number;
  salary_accrued?: number;
  total_accrued?: number;
  total_deductions?: number;
  total_payable?: number;
  // Новые поля для налогов работодателя и дополнительных расчетов
  fszn_tax?: number;
  insurance_tax?: number;
  total_employee_cost?: number;
  payable_without_salary?: number;
  
  // Поля для отпускных и больничных
  vacation_pay_current?: number;  // Выплата отпускных за текущий месяц
  vacation_pay_next?: number;     // Выплата отпускных за следующий месяц
  sick_leave_payment?: number;    // Начисление по больничному листу
  payment_date?: string | null;   // Дата выплаты зарплаты (YYYY-MM-DD)
};

// Тип для отображения зарплаты с данными сотрудника
export type PayrollWithEmployee = Payroll & {
  employee: Employee;
};

// Типы для работы с отпусками
export type VacationSettings = {
  id: number;
  created_at: string;
  updated_at: string;
  // Поля из базы данных
  calculation_period_months: number;
  vacation_coefficient?: number;
  default_days_per_year?: number;
  // Поля для совместимости с кодом
  days_per_year?: number;
  coefficient?: number;
  min_days_per_request?: number;
  max_consecutive_days?: number;
};

export type VacationBalance = {
  id: number;
  created_at: string;
  updated_at: string;
  employee_id: number;
  year: number;
  days_entitled: number;
  days_used: number;
  days_scheduled: number;
  days_remaining: number;
};

export type VacationRequest = {
  id: number;
  created_at: string;
  updated_at: string;
  employee_id: number;
  start_date: string;
  end_date: string;
  days_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  payment_amount?: number;
  average_salary?: number;
  calculation_period_start?: string;
  calculation_period_end?: string;
  notes?: string;
};

export type VacationPayment = {
  id: number;
  created_at: string;
  vacation_request_id: number;
  payment_date: string;
  amount: number;
  is_paid: boolean;
};

export type VacationRequestWithEmployee = VacationRequest & {
  employee: Employee;
};

// Types for timesheet entries
export type TimesheetStatus = 'work' | 'sick' | 'unpaid' | 'vacation';

export type TimesheetEntry = {
  id?: number;
  employee_id: number;
  work_date: string;
  status: TimesheetStatus;
  created_at?: string;
  updated_at?: string;
};

export type TimesheetEntryWithEmployee = TimesheetEntry & {
  employee: Pick<Employee, 'id' | 'name' | 'position'>;
};
