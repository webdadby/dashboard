import { supabase } from './client';
import { Payroll, PayrollWithEmployee } from './types';

export const payrollsApi = {
  // Получить все начисления зарплаты
  async getAll(): Promise<PayrollWithEmployee[]> {
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
  async getByYearMonth(year: number, month: number): Promise<PayrollWithEmployee[]> {
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
  async getByEmployeeYearMonth(employeeId: number, year: number, month: number): Promise<PayrollWithEmployee | null> {
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
  async getByEmployeeId(employeeId: number): Promise<Payroll[]> {
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
  async upsert(payroll: Omit<Payroll, 'id' | 'created_at'>): Promise<Payroll> {
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
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('payrolls')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
