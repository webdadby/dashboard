import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

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
  
  // Получить сотрудника по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Employee;
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
    try {
      // Создаем копию объекта employee и обрабатываем данные
      const updateData: Record<string, any> = { ...employee };
      
      // Обработка дат
      if ('hire_date' in updateData && updateData.hire_date) {
        updateData.hire_date = format(new Date(updateData.hire_date), 'yyyy-MM-dd');
      }
      
      if ('termination_date' in updateData) {
        updateData.termination_date = updateData.termination_date 
          ? format(new Date(updateData.termination_date), 'yyyy-MM-dd')
          : null;
      }
      
      // Обработка числовых полей
      if ('rate' in updateData) {
        updateData.rate = Number(updateData.rate) || 0;
      }
      
      
      // Если есть rate и не передан base_salary, пересчитываем base_salary
      if (updateData.rate !== undefined && updateData.base_salary === undefined) {
        // Получаем минимальную зарплату из настроек
        const { data: settingsData } = await supabase
          .from('settings')
          .select('min_salary')
          .single();
        
        const minSalary = settingsData?.min_salary || 735;
        updateData.base_salary = updateData.rate * minSalary;
      }
      
      // Удаляем tax_identifier, если он пустая строка или undefined
      if (updateData.tax_identifier === '' || updateData.tax_identifier === undefined) {
        delete updateData.tax_identifier;
      }
      
      console.log('Updating employee with data:', updateData);
      
      // Сначала получаем текущие данные сотрудника, чтобы проверить существующие значения
      const { data: existingEmployee, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching existing employee data:', fetchError);
        throw fetchError;
      }
      
      // Создаем объект для обновления с обязательными полями
      const updatePayload: any = {};
      
      // Добавляем все поля из updateData, но обрабатываем специальные случаи
      Object.keys(updateData).forEach(key => {
        // Всегда включаем termination_date, даже если его нет в существующей записи
        if (key === 'termination_date' || key in existingEmployee || key === 'tax_identifier') {
          updatePayload[key] = updateData[key as keyof typeof updateData];
        }
      });
      
      console.log('Prepared update payload:', updatePayload);
      
      // Обновляем запись
      const { data: updatedData, error: updateError } = await supabase
        .from('employees')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();
      
      if (updateError) {
        console.error('Supabase update error:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        
        // Если ошибка связана с tax_identifier, пробуем обновить без него
        if (updateError.message.includes('tax_identifier')) {
          console.log('Retrying update without tax_identifier');
          delete updatePayload.tax_identifier;
          
          const { data: retryData, error: retryError } = await supabase
            .from('employees')
            .update(updatePayload)
            .eq('id', id)
            .select('*')
            .single();
            
          if (retryError) {
            console.error('Retry update error:', retryError);
            throw retryError;
          }
          
          return retryData;
        }
        
        throw updateError;
      }
      
      console.log('Successfully updated employee:', updatedData);
      return updatedData;
    } catch (error) {
      console.error('Error in employeesApi.update:', error);
      throw error;
    }
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
      // Получаем все записи настроек
      const { data, error } = await supabase
        .from('settings')
        .select('*');
      
      if (error) throw error;
      
      // Преобразуем массив записей в объект с ключами и значениями
      const defaultSettings = { 
        min_salary: 735, 
        income_tax: 13, 
        fszn_rate: 34, 
        insurance_rate: 0.6, 
        benefit_amount: 50000, 
        tax_deduction: 5000 
      };
      
      // Если данных нет, возвращаем значения по умолчанию
      if (!data || data.length === 0) {
        console.log('No settings found, using defaults:', defaultSettings);
        return defaultSettings;
      }
      
      // Преобразуем массив записей в объект
      const settings: Record<string, string | number> = {};
      data.forEach(item => {
        // Преобразуем строковые значения в числа
        const numValue = Number(item.value);
        settings[item.key] = isNaN(numValue) ? item.value : numValue;
      });
      
      console.log('Settings loaded from database:', settings);
      
      // Объединяем с значениями по умолчанию, чтобы гарантировать наличие всех необходимых полей
      return { ...defaultSettings, ...settings };
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Return default values if there's an error
      return { 
        min_salary: 735, 
        income_tax: 13, 
        fszn_rate: 34, 
        insurance_rate: 0.6, 
        benefit_amount: 50000, 
        tax_deduction: 5000 
      };
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
      .upsert({
        ...workNorm,
        // Ensure working_days and holiday_days are included with defaults if not provided
        working_days: workNorm.working_days ?? 20,
        holiday_days: workNorm.holiday_days ?? 0,
      }, { onConflict: 'year,month' })
      .select('*');
    
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
  
  // Получить все начисления зарплаты для конкретного сотрудника
  async getByEmployeeId(employeeId: number) {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*')
      .eq('employee_id', employeeId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (error) throw error;
    return data as Payroll[] || [];
  },
  
  // Создать или обновить начисление зарплаты
  async upsert(payroll: Omit<Payroll, 'id' | 'created_at'>) {
    // Убедимся, что числовые поля не null перед сохранением
    const dataToSave = {
      ...payroll,
      vacation_pay_current: payroll.vacation_pay_current || 0,
      vacation_pay_next: payroll.vacation_pay_next || 0,
      sick_leave_payment: payroll.sick_leave_payment || 0,
    };

    const { data, error } = await supabase
      .from('payrolls')
      .upsert(dataToSave, { onConflict: 'employee_id,year,month' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting payroll:', error);
      throw error;
    }

    return data as Payroll;
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

// Функции для работы с отпусками
export const vacationsApi = {
  // Получить настройки отпусков
  async getSettings(): Promise<VacationSettings> {
    try {
      const { data, error } = await supabase
        .from('vacation_settings')
        .select('*')
        .single();
      
      if (error) throw error;

      return data as VacationSettings;
    } catch (error) {
      console.log('Не удалось получить настройки отпусков, возвращаем значения по умолчанию:', error);
      // Возвращаем значения по умолчанию
      return {
        id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        calculation_period_months: 12,
        vacation_coefficient: 1.0,
        default_days_per_year: 24,
        days_per_year: 24,
        coefficient: 1.0,
        min_days_per_request: 1,
        max_consecutive_days: 30
      } as VacationSettings;
    }
  },
  
  // Обновить настройки отпусков
  async updateSettings(settings: Partial<VacationSettings>): Promise<VacationSettings> {
    try {
      // Добавляем id=1 если не указан, чтобы всегда работать с одной записью настроек
      const settingsWithId = { ...settings, id: settings.id || 1 };
      
      const { data, error } = await supabase
        .from('vacation_settings')
        .upsert(settingsWithId)
        .select();
      
      if (error) {
        console.warn('Ошибка при сохранении настроек отпусков (таблица может не существовать):', error);
        // Возвращаем переданные настройки, как будто они были сохранены
        return {
          ...settingsWithId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as VacationSettings;
      }
      
      return data[0] as VacationSettings;
    } catch (error) {
      console.warn('Ошибка при сохранении настроек отпусков:', error);
      // Возвращаем переданные настройки, как будто они были сохранены
      return {
        ...settings,
        id: settings.id || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as VacationSettings;
    }
  },
  
  // Получить баланс отпусков для всех сотрудников
  async getAllBalances(): Promise<VacationBalance[]> {
    const { data, error } = await supabase
      .from('vacation_balances')
      .select(`
        *,
        employee:employee_id(*)
      `)
      .order('year', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Получить баланс отпусков для конкретного сотрудника
  async getBalanceByEmployeeId(employeeId: number): Promise<VacationBalance[]> {
    const { data, error } = await supabase
      .from('vacation_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .order('year', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Получить баланс отпусков для конкретного сотрудника и года
  async getBalanceByEmployeeIdAndYear(employeeId: number, year: number): Promise<VacationBalance> {
    const { data, error } = await supabase
      .from('vacation_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 - не найдено
    return data as VacationBalance;
  },
  
  // Создать или обновить баланс отпусков
  async upsertBalance(balance: Omit<VacationBalance, 'id' | 'created_at' | 'updated_at'>): Promise<VacationBalance> {
    // Проверяем, существует ли запись
    const { data: existingData } = await supabase
      .from('vacation_balances')
      .select('id')
      .eq('employee_id', balance.employee_id)
      .eq('year', balance.year)
      .maybeSingle();
    
    let result;
    
    if (existingData?.id) {
      // Обновляем существующую запись
      const { data, error } = await supabase
        .from('vacation_balances')
        .update(balance)
        .eq('id', existingData.id)
        .select();
      
      if (error) throw error;
      result = data?.[0];
    } else {
      // Создаем новую запись
      const { data, error } = await supabase
        .from('vacation_balances')
        .insert(balance)
        .select();
      
      if (error) throw error;
      result = data?.[0];
    }
    
    return result as VacationBalance;
  },
  
  // Получить все заявки на отпуск
  async getAllRequests(): Promise<VacationRequestWithEmployee[]> {
    const { data, error } = await supabase
      .from('vacation_requests')
      .select(`
        *,
        employee:employee_id(*)
      `)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Получить заявки на отпуск для конкретного сотрудника
  async getRequestsByEmployeeId(employeeId: number): Promise<VacationRequest[]> {
    const { data, error } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Создать заявку на отпуск
  async createRequest(request: Omit<VacationRequest, 'id' | 'created_at' | 'updated_at'>): Promise<VacationRequest> {
    // Сначала получаем настройки, чтобы знать количество дней по умолчанию
    const settings = await this.getSettings();
    const defaultDays = settings.days_entitled || 24; // 24 дня по ТК РБ
    
    // Сначала создаем заявку на отпуск
    const { data, error } = await supabase
      .from('vacation_requests')
      .insert(request)
      .select();
    
    if (error) throw error;
    
    // Получаем или создаем баланс отпусков для сотрудника
    const currentYear = new Date().getFullYear();
    
    try {
      // Пытаемся получить существующий баланс
      let existingBalance;
      try {
        existingBalance = await this.getBalanceByEmployeeIdAndYear(request.employee_id, currentYear);
      } catch (err) {
        // Если баланс не найден, это нормально - создадим новый
        existingBalance = null;
      }
      
      let balanceData: Omit<VacationBalance, 'id' | 'created_at' | 'updated_at'>;
      
      // Если баланс существует, обновляем его
      if (existingBalance) {
        balanceData = {
          employee_id: request.employee_id,
          year: currentYear,
          days_entitled: existingBalance.days_entitled || defaultDays,
          days_used: existingBalance.days_used || 0,
          days_scheduled: (existingBalance.days_scheduled || 0) + request.days_count,
          days_remaining: (existingBalance.days_entitled || defaultDays) - (existingBalance.days_used || 0) - (existingBalance.days_scheduled || 0) - request.days_count
        };
      } else {
        // Если баланса нет, создаем новый
        balanceData = {
          employee_id: request.employee_id,
          year: currentYear,
          days_entitled: defaultDays,
          days_used: 0,
          days_scheduled: request.days_count,
          days_remaining: defaultDays - request.days_count
        };
      }
      
      // Сохраняем обновленный баланс
      await this.upsertBalance(balanceData);
    } catch (error) {
      console.error('Ошибка при обновлении баланса отпусков:', error);
      // Продолжаем выполнение, даже если не удалось обновить баланс
    }
    
    return data[0] as VacationRequest;
  },
  
  // Обновить заявку на отпуск
  async updateRequest(id: number, request: Partial<Omit<VacationRequest, 'id' | 'created_at' | 'updated_at'>>): Promise<VacationRequest> {
    const { data, error } = await supabase
      .from('vacation_requests')
      .update(request)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as VacationRequest;
  },
  
  // Удалить заявку на отпуск
  async deleteRequest(id: number): Promise<void> {
    const { error } = await supabase
      .from('vacation_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  // Создать платеж по отпуску
  async createPayment(payment: Omit<VacationPayment, 'id' | 'created_at'>): Promise<VacationPayment> {
    const { data, error } = await supabase
      .from('vacation_payments')
      .insert(payment)
      .select();
    
    if (error) throw error;
    return data[0] as VacationPayment;
  },
  
  // Получить платежи по заявке на отпуск
  async getPaymentsByRequestId(requestId: number): Promise<VacationPayment[]> {
    const { data, error } = await supabase
      .from('vacation_payments')
      .select('*')
      .eq('vacation_request_id', requestId)
      .order('payment_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },
  
  // Рассчитать сумму отпускных
  async calculateVacationPay(employeeId: number, startDate: string, endDate: string, daysCount: number): Promise<{
    paymentAmount: number;
    averageSalary: number;
    periodStart: string;
    periodEnd: string;
  }> {
    // Получаем настройки отпусков
    const settings = await this.getSettings();
    
    // Определяем расчетный период - 12 месяцев, предшествующих месяцу начала отпуска
    const startDateObj = new Date(startDate);
    const vacationMonth = startDateObj.getMonth();
    const vacationYear = startDateObj.getFullYear();
    
    // Конец расчетного периода - последний день месяца перед месяцем отпуска
    const periodEndObj = new Date(vacationYear, vacationMonth, 0);
    const periodEnd = periodEndObj.toISOString().split('T')[0];
    
    // Начало расчетного периода - первый день месяца за 12 месяцев до конца расчетного периода
    const periodStartObj = new Date(periodEndObj);
    periodStartObj.setMonth(periodStartObj.getMonth() - 11);
    periodStartObj.setDate(1);
    const periodStart = periodStartObj.toISOString().split('T')[0];
    
    // Получаем все начисления за расчетный период
    const { data: payrolls, error } = await supabase
      .from('payrolls')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('year', periodStartObj.getFullYear())
      .lte('year', periodEndObj.getFullYear())
      .order('year', { ascending: true })
      .order('month', { ascending: true });
      
    console.log('Найдено начислений:', payrolls?.length || 0);
    
    if (error) throw error;
    
    // Группируем начисления по месяцам
    const monthlyEarningsMap = new Map<string, { 
      year: number, 
      month: number, 
      earnings: number, 
      isFullMonth: boolean,
      workingDays: number,
      holidayDays: number,
      workedHours: number
    }>();
    
    // Получаем нормы рабочего времени за расчетный период
    const startYear = periodStartObj.getFullYear();
    const startMonth = periodStartObj.getMonth() + 1; // JS months are 0-indexed
    const endYear = periodEndObj.getFullYear();
    const endMonth = periodEndObj.getMonth() + 1;
    
    const { data: workNorms } = await supabase
      .from('work_norms')
      .select('*')
      .or(`year.gt.${startYear-1},and(year.eq.${startYear},month.gte.${startMonth})`)
      .or(`year.lt.${endYear+1},and(year.eq.${endYear},month.lte.${endMonth})`);
    
    // Получаем данные о сотруднике для проверки изменения ставки
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();
    
    if (!employee) throw new Error('Сотрудник не найден');
    
    // Обрабатываем каждое начисление и группируем по месяцам
    payrolls.forEach(payroll => {
      const year = payroll.year;
      const month = payroll.month;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      // Находим норму рабочего времени для этого месяца
      const workNorm = workNorms?.find(wn => wn.year === year && wn.month === month);
      const normHours = workNorm?.norm_hours || 0;
      const workingDays = workNorm?.working_days || 21; // Default to 21 working days if not set
      const holidayDays = workNorm?.holiday_days || 0;
      
      // Определяем, является ли месяц полным
      const isFullMonth = normHours > 0 && payroll.worked_hours >= normHours;
      
      // Получаем или создаем запись за месяц
      let monthData = monthlyEarningsMap.get(monthKey);
      
      if (!monthData) {
        monthData = {
          year,
          month,
          earnings: 0,
          isFullMonth,
          workingDays,
          holidayDays,
          workedHours: 0
        };
        monthlyEarningsMap.set(monthKey, monthData);
      }
      
      // Обновляем данные за месяц с учетом повышающего коэффициента
      // Для месяцев до января 2025 применяем коэффициент 735/630 = 1.1666666666666667
      if (payroll.total_accrued) {
        let earnings = Number(payroll.total_accrued) || 0;
        // Проверяем, что месяц раньше января 2025 (год < 2025 или год = 2025 и месяц < 1)
        const isBeforeJan2025 = year < 2025 || (year === 2025 && month < 1);
        if (isBeforeJan2025) {
          const coefficient = 735 / 630; // 1.1666666666666667
          console.log(`Применяем коэффициент ${coefficient} к начислениям за ${month}.${year}: ${earnings} -> ${earnings * coefficient}`);
          earnings *= coefficient; // Повышающий коэффициент 735/630
        }
        monthData.earnings += earnings;
      }
      monthData.workedHours += Number(payroll.worked_hours) || 0;
      monthData.isFullMonth = monthData.isFullMonth || isFullMonth;
    });
    
    // Преобразуем Map в массив для сортировки
    const monthlyEarningsList = Array.from(monthlyEarningsMap.values());
    
    // Сортируем месяцы по дате
    const sortedMonths = [...monthlyEarningsList].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    
    // Собираем данные по месяцам для отладки
    const monthlyData: Array<{
      month: string;
      year: number;
      monthNumber: number;
      earnings: number;
      workingDays: number;
      holidayDays: number;
      isFullMonth: boolean;
    }> = [];
    
    // Рассчитываем общий заработок и количество месяцев с начислениями
    let totalEarnings = 0;
    let totalWorkingDays = 0;
    let totalHolidayDays = 0;
    let monthsWithEarnings = 0;
    
    // Собираем все месяцы с начислениями
    const monthsWithData = new Set<string>();
    
    // Суммируем начисления по всем месяцам
    sortedMonths.forEach(monthData => {
      const monthKey = `${monthData.year}-${monthData.month.toString().padStart(2, '0')}`;
      
      // Добавляем данные в массив для отладки
      monthlyData.push({
        month: new Date(monthData.year, monthData.month - 1).toLocaleString('ru-RU', { month: 'long' }),
        year: monthData.year,
        monthNumber: monthData.month,
        earnings: monthData.earnings,
        workingDays: monthData.workingDays,
        holidayDays: monthData.holidayDays,
        isFullMonth: monthData.isFullMonth
      });
      
      // Учитываем месяц, если по нему есть начисления
      if (monthData.earnings > 0) {
        if (!monthsWithData.has(monthKey)) {
          monthsWithData.add(monthKey);
          monthsWithEarnings++;
        }
        
        totalEarnings += monthData.earnings;
        totalWorkingDays += monthData.workingDays;
        totalHolidayDays += monthData.holidayDays;
      }
    });
    
    // Сортируем месяцы по дате
    monthlyData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNumber - b.monthNumber;
    });
    
    // Выводим отладочную информацию
    console.log('\n=== РАСЧЕТ СРЕДНЕГО ЗАРАБОТКА ===');
    console.log('Период расчета:', periodStart, '-', periodEnd);
    console.log('\nНачисления по месяцам:');
    console.log('----------------------');
    
    // Выводим таблицу с начислениями
    monthlyData.forEach(item => {
      console.log(
        `${item.month} ${item.year}`.padEnd(15),
        `| Начислено: ${item.earnings.toFixed(2)}`.padEnd(25),
        `| Рабочих дней: ${item.workingDays}`.padEnd(25),
        `| Праздничных: ${item.holidayDays}`.padEnd(20),
        `| Полный месяц: ${item.isFullMonth ? 'да' : 'нет'}`
      );
    });
    
    console.log('----------------------');
    
    // Если нет месяцев с начислениями, используем базовую ставку
    if (monthsWithEarnings === 0) {
      const baseSalary = employee.base_salary || (employee.rate * 735);
      totalEarnings = baseSalary * 12; // Умножаем на 12 месяцев
      monthsWithEarnings = 12;
      console.log('Используется базовая ставка:', baseSalary, 'x 12 =', totalEarnings);
    }
    
    // Рассчитываем среднемесячный заработок (без округления)
    const averageMonthlySalary = monthsWithEarnings > 0 ? totalEarnings / monthsWithEarnings : 0;
    
    // Рассчитываем средний дневной заработок и округляем до 2 знаков после запятой
    const averageDailyEarnings = Math.round((averageMonthlySalary / 29.6) * 100) / 100;
    
    // Рассчитываем сумму отпускных: округленный средний дневной заработок * количество дней
    const paymentAmount = averageDailyEarnings * daysCount;
    
    console.log(`Итого за ${monthsWithEarnings} мес.: ${totalEarnings.toFixed(2)}`);
    console.log('Среднемесячный заработок:', averageMonthlySalary.toFixed(2));
    console.log('Средний дневной заработок (округленный до копеек):', averageDailyEarnings.toFixed(2));
    console.log('Количество дней отпуска:', daysCount);
    console.log('Сумма отпускных:', paymentAmount.toFixed(2));
    
    return {
      paymentAmount: Math.round(paymentAmount * 100) / 100, // Округляем до копеек
      averageSalary: Math.round(averageMonthlySalary * 100) / 100,
      periodStart,
      periodEnd
    };
  },

  // Получить общую сумму отпускных для всех сотрудников
  async getTotalVacationPayouts(): Promise<{
    totalAmount: number;
    employeeTotals: { employeeId: number; employeeName: string; amount: number }[];
  }> {
    // Получаем все заявки на отпуск со статусом 'approved' или 'completed'
    const { data: requests, error } = await supabase
      .from('vacation_requests')
      .select(`
        *,
        employee:employee_id(id, name)
      `)
      .in('status', ['approved', 'completed']);

    if (error) throw error;

    // Рассчитываем общую сумму и суммы по сотрудникам
    let totalAmount = 0;
    const employeeTotals: { employeeId: number; employeeName: string; amount: number }[] = [];

    requests.forEach((request: any) => {
      if (request.payment_amount) {
        totalAmount += request.payment_amount;

        // Находим или создаем запись для сотрудника
        const employeeIndex = employeeTotals.findIndex(e => e.employeeId === request.employee_id);
        if (employeeIndex >= 0) {
          employeeTotals[employeeIndex].amount += request.payment_amount;
        } else {
          employeeTotals.push({
            employeeId: request.employee_id,
            employeeName: request.employee?.name || 'Unknown',
            amount: request.payment_amount
          });
        }
      }
    });

    return {
      totalAmount,
      employeeTotals
    };
  }
};

// Types for timesheet entries
export type TimesheetStatus = 'work' | 'sick' | 'unpaid' | 'vacation';

declare module '@supabase/supabase-js' {
  interface PostgrestFilterBuilder<Source, Data, R = any> {
    select(columns: string): PostgrestFilterBuilder<Source, any, any>;
  }
}

export interface TimesheetEntry {
  id?: number;
  employee_id: number;
  work_date: string; // ISO date string
  status: TimesheetStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TimesheetEntryWithEmployee extends TimesheetEntry {
  employee: Pick<Employee, 'id' | 'name' | 'position'>;
}

// Functions for timesheet operations
export const timesheetsApi = {
  // Get timesheet entries for a specific month
  async getByMonth(year: number, month: number): Promise<TimesheetEntryWithEmployee[]> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();

    const { data, error } = await supabase
      .from('timesheets')
      .select(`
        *,
        employee:employee_id(id, name, position)
      `)
      .gte('work_date', startDate)
      .lte('work_date', endDate);
    
    if (error) throw error;
    return data || [];
  },

  // Get timesheet entries for a specific employee and date range
  async getByEmployeeAndDateRange(
    employeeId: number, 
    startDate: string, 
    endDate: string
  ): Promise<TimesheetEntry[]> {
    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('work_date', startDate)
      .lte('work_date', endDate);
    
    if (error) throw error;
    return data || [];
  },

  // Create or update a timesheet entry
  async upsert(entry: Omit<TimesheetEntry, 'created_at' | 'updated_at'>): Promise<TimesheetEntry> {
    const { data, error } = await supabase
      .from('timesheets')
      .upsert({
        ...entry,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Bulk create or update timesheet entries
  async bulkUpsert(entries: Omit<TimesheetEntry, 'created_at' | 'updated_at'>[]): Promise<TimesheetEntry[]> {
    if (!entries.length) return [];
    
    const now = new Date().toISOString();
    const entriesWithTimestamps = entries.map(entry => ({
      ...entry,
      updated_at: now,
    }));
    
    // Process in chunks to avoid hitting URL length limits
    const CHUNK_SIZE = 50;
    const results: TimesheetEntry[] = [];
    
    for (let i = 0; i < entriesWithTimestamps.length; i += CHUNK_SIZE) {
      const chunk = entriesWithTimestamps.slice(i, i + CHUNK_SIZE);
      
      const { data, error } = await supabase
        .from('timesheets')
        .upsert(chunk, { 
          onConflict: 'employee_id,work_date',
          ignoreDuplicates: false
        })
        .select('*');
        
      if (error) {
        console.error('Error in bulkUpsert:', error);
        throw new Error(`Failed to save timesheet entries: ${error.message}`);
      }
      
      if (data) {
        results.push(...data);
      }
    }
    
    return results;
  },

  // Delete a timesheet entry
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('timesheets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Get attendance summary for an employee in a specific month
  async getEmployeeAttendanceSummary(
    employeeId: number, 
    year: number, 
    month: number
  ): Promise<Record<TimesheetStatus, number>> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();
    
    // First, get all records for the date range
    const { data, error } = await supabase
      .from('timesheets')
      .select('status')
      .eq('employee_id', employeeId)
      .gte('work_date', startDate)
      .lte('work_date', endDate);
    
    if (error) throw error;
    
    // Initialize with zero counts for all statuses
    const summary: Record<TimesheetStatus, number> = {
      work: 0,
      sick: 0,
      unpaid: 0,
      vacation: 0,
    };
    
    // Count statuses manually
    data?.forEach(({ status }) => {
      if (status in summary) {
        summary[status as TimesheetStatus]++;
      }
    });
    
    return summary;
  }
};
