import { supabase } from './client';
import { format } from 'date-fns';
import { 
  VacationSettings, 
  VacationBalance, 
  VacationRequest, 
  VacationPayment, 
  VacationRequestWithEmployee 
} from './types';

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
    const defaultDays = settings.days_per_year || settings.default_days_per_year || 24; // 24 дня по ТК РБ
    
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
  
  // Обновить платеж по отпуску
  async updatePayment(id: number, payment: Partial<Omit<VacationPayment, 'id' | 'created_at'>>): Promise<VacationPayment> {
    const { data, error } = await supabase
      .from('vacation_payments')
      .update(payment)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as VacationPayment;
  },
  
  // Удалить платеж по отпуску
  async deletePayment(id: number): Promise<void> {
    const { error } = await supabase
      .from('vacation_payments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  // Рассчитать отпускные выплаты
  async calculateVacationPay(
    employeeId: number,
    startDate: string,
    endDate: string,
    daysCount: number
  ): Promise<{
    paymentAmount: number;
    averageSalary: number;
    periodStart: string;
    periodEnd: string;
  }> {
    try {
      console.log('Расчет отпускных для сотрудника ID:', employeeId, 'с', startDate, 'по', endDate, 'дней:', daysCount);
      
      // Проверяем входные данные
      if (!employeeId || !startDate || !endDate || daysCount <= 0) {
        console.error('Некорректные входные данные для расчета отпускных');
        throw new Error('Некорректные входные данные для расчета отпускных');
      }
      
      // Получаем данные о сотруднике
      console.log('Запрашиваем данные сотрудника из базы...');
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('rate, base_salary, hire_date')
        .eq('id', employeeId)
        .single();
      
      if (employeeError) {
        console.error('Ошибка при получении данных сотрудника:', employeeError);
        throw employeeError;
      }
      
      if (!employee) {
        console.error('Сотрудник не найден');
        throw new Error('Сотрудник не найден');
      }
      
      console.log('Данные сотрудника получены:', employee);
      
      // Получаем настройки отпусков для коэффициента
      console.log('Получаем настройки отпусков...');
      const settings = await this.getSettings();
      console.log('Настройки отпусков:', settings);
      
      // Рассчитываем период для расчета средней зарплаты (обычно 12 месяцев)
      const calculationMonths = settings.calculation_period_months || 12;
      const endDateObj = new Date(endDate);
      const periodEndDate = new Date(endDateObj);
      const periodStartDate = new Date(endDateObj);
      periodStartDate.setMonth(periodStartDate.getMonth() - calculationMonths);
      
      // Форматируем даты для возврата
      const periodStart = format(periodStartDate, 'yyyy-MM-dd');
      const periodEnd = format(periodEndDate, 'yyyy-MM-dd');
      
      // Рассчитываем среднюю зарплату (в реальном приложении здесь был бы более сложный расчет)
      // Например, учет премий, надбавок и т.д.
      // Используем base_salary если оно есть, иначе используем ставку и минимальную зарплату
      const averageSalary = employee?.base_salary || (employee?.rate ? employee.rate * 735 : 0);
      console.log('Средняя зарплата:', averageSalary);
      
      // Рассчитываем сумму отпускных
      // В простейшем случае: средняя дневная зарплата * количество дней * коэффициент
      const dailyRate = averageSalary / 30; // Упрощенно считаем, что в месяце 30 дней
      const coefficient = settings.vacation_coefficient || 1.0;
      const paymentAmount = dailyRate * daysCount * coefficient;
      
      console.log('Расчет завершен:', {
        dailyRate,
        coefficient,
        paymentAmount,
        averageSalary,
        periodStart,
        periodEnd
      });
      
      return {
        paymentAmount,
        averageSalary,
        periodStart,
        periodEnd
      };
    } catch (error: any) {
      // Более подробное логирование ошибки
      console.error('Ошибка при расчете отпускных:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      // Возвращаем нулевые значения в случае ошибки
      return {
        paymentAmount: 0,
        averageSalary: 0,
        periodStart: startDate,
        periodEnd: endDate
      };
    }
  },
  
  // Получить общую сумму выплат по отпускам
  async getTotalVacationPayouts() {
    try {
      // Получаем все платежи по отпускам
      const { data: payments, error } = await supabase
        .from('vacation_payments')
        .select(`
          *,
          vacation_request:vacation_request_id(employee_id)
        `);
      
      if (error) throw error;
      
      if (!payments || payments.length === 0) {
        return {
          totalAmount: 0,
          employeeTotals: []
        };
      }
      
      // Получаем информацию о сотрудниках
      const employeeIds = [...new Set(payments.map(p => p.vacation_request.employee_id))];
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);
      
      if (employeesError) throw employeesError;
      
      // Группируем платежи по сотрудникам
      const employeeTotals = [];
      let totalAmount = 0;
      
      for (const employeeId of employeeIds) {
        const employeePayments = payments.filter(p => p.vacation_request.employee_id === employeeId);
        const amount = employeePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const employee = employees.find(e => e.id === employeeId);
        
        employeeTotals.push({
          employeeId,
          employeeName: employee ? `${employee.first_name} ${employee.last_name}` : `Сотрудник #${employeeId}`,
          amount
        });
        
        totalAmount += amount;
      }
      
      return {
        totalAmount,
        employeeTotals
      };
    } catch (error) {
      console.error('Ошибка при получении данных о выплатах по отпускам:', error);
      return {
        totalAmount: 0,
        employeeTotals: []
      };
    }
  }
};
