import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Для работы с Supabase необходимо указать URL и ключ API
// В реальном проекте эти значения должны быть в .env файле
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Функция для создания клиента Supabase
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

// Создаем клиент Supabase для использования в API функциях
export const supabase = createClient();

// Типы данных для работы с сотрудниками в соответствии с таблицей в БД
export type Employee = {
  id: number;
  created_at: string;
  name: string;
  position: string;
  hire_date: string; // в формате ISO для передачи на сервер
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
};

// Тип для начисления зарплаты
export interface Payroll {
  id: number;
  created_at: string;
  employee_id: number;
  year: number;
  month: number;
  worked_hours: number;
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
};

// Тип для отображения зарплаты с данными сотрудника
export type PayrollWithEmployee = Payroll & {
  employee: Employee;
};

// Функции для работы с сотрудниками
export const employeesApi = {
  // Получить всех сотрудников
  async getAll() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Создание нового сотрудника
  async create(employee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
    // Получаем минимальную зарплату из настроек
    const { data: settingsData } = await supabase
      .from('settings')
      .select('min_salary')
      .single();
    
    const minSalary = settingsData?.min_salary || 735;
    
    // Добавляем base_salary на основе rate и min_salary
    const employeeWithBaseSalary = {
      ...employee,
      base_salary: employee.rate * minSalary
    };
    
    const { data, error } = await supabase
      .from('employees')
      .insert(employeeWithBaseSalary)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Обновить данные сотрудника
  async update(id: number, employee: Partial<Omit<Employee, 'id' | 'created_at'>>) {
    // Если есть rate, пересчитываем base_salary
    if (employee.rate !== undefined) {
      // Получаем минимальную зарплату из настроек
      const { data: settingsData } = await supabase
        .from('settings')
        .select('min_salary')
        .single();
      
      const minSalary = settingsData?.min_salary || 735;
      
      // Добавляем base_salary на основе rate и min_salary
      employee.base_salary = employee.rate * minSalary;
    }
    
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  // Удалить сотрудника
  async delete(id: number) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// Функции для работы с настройками
export const settingsApi = {
  // Получить настройки
  async get() {
    try {
      // Получаем первую запись без использования поля id
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      return data?.[0] || { min_salary: 735, income_tax: 13, fszn_rate: 34, insurance_rate: 0.6 }; // Возвращаем первую запись или значения по умолчанию
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Return default values if there's an error
      return { min_salary: 735, income_tax: 13, fszn_rate: 34, insurance_rate: 0.6 };
    }
  },
  
  // Обновить настройки
  async update(settings: any) {
    const { data, error } = await supabase
      .from('settings')
      .update(settings)
      .eq('id', 1) // Предполагаем, что у нас только одна запись в таблице settings
      .select();
    
    if (error) throw error;
    return data?.[0];
  }
};

// Функции для работы с нормами рабочего времени
export const workNormsApi = {
  // Получить все нормы рабочего времени
  async getAll() {
    const { data, error } = await supabase
      .from('work_norms')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Получить норму рабочего времени для конкретного месяца и года
  async getByYearMonth(year: number, month: number) {
    const { data, error } = await supabase
      .from('work_norms')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 - не найдено
    return data;
  },
  
  // Создать или обновить норму рабочего времени
  async upsert(workNorm: Omit<WorkNorm, 'id'>) {
    const { data, error } = await supabase
      .from('work_norms')
      .upsert(workNorm, { onConflict: 'year,month' })
      .select();
    
    if (error) throw error;
    return data?.[0];
  },
  
  // Удалить норму рабочего времени
  async delete(id: number) {
    const { error } = await supabase
      .from('work_norms')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Функции для работы с начислениями зарплаты
export const payrollsApi = {
  // Получить все начисления зарплаты
  async getAll() {
    const { data, error } = await supabase
      .from('payrolls')
      .select(`
        *,
        employee:employee_id(*)
      `)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (error) throw error;
    return (data || []) as PayrollWithEmployee[];
  },
  
  // Получить начисления зарплаты за конкретный месяц и год
  async getByYearMonth(year: number, month: number) {
    const { data, error } = await supabase
      .from('payrolls')
      .select(`
        *,
        employee:employee_id(*)
      `)
      .eq('year', year)
      .eq('month', month)
      .order('employee_id');
    
    if (error) throw error;
    return (data || []) as PayrollWithEmployee[];
  },
  
  // Получить начисление зарплаты для конкретного сотрудника за месяц
  async getByEmployeeYearMonth(employeeId: number, year: number, month: number) {
    const { data, error } = await supabase
      .from('payrolls')
      .select(`
        *,
        employee:employee_id(*)
      `)
      .eq('employee_id', employeeId)
      .eq('year', year)
      .eq('month', month)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 - не найдено
    return data as PayrollWithEmployee | null;
  },
  
  // Создать или обновить начисление зарплаты
  async upsert(payroll: Omit<Payroll, 'id' | 'created_at'>) {
    // Сначала проверяем, существует ли уже запись для этого сотрудника, месяца и года
    const { data: existingData } = await supabase
      .from('payrolls')
      .select('id')
      .eq('employee_id', payroll.employee_id)
      .eq('year', payroll.year)
      .eq('month', payroll.month)
      .maybeSingle();
    
    let result;
    
    if (existingData?.id) {
      // Если запись существует, обновляем её
      const { data, error } = await supabase
        .from('payrolls')
        .update(payroll)
        .eq('id', existingData.id)
        .select();
      
      if (error) throw error;
      result = data?.[0];
    } else {
      // Если записи нет, создаем новую
      const { data, error } = await supabase
        .from('payrolls')
        .insert(payroll)
        .select();
      
      if (error) throw error;
      result = data?.[0];
    }
    
    return result as Payroll;
  },
  
  // Удалить начисление зарплаты
  async delete(id: number) {
    const { error } = await supabase
      .from('payrolls')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
