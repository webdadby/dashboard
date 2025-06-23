import { format } from 'date-fns';
import { supabase } from './client';
import { Employee } from './types';

// Функции для работы с сотрудниками
export const employeesApi = {
  // Получить всех сотрудников
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Employee[];
  },
  
  // Получить сотрудника по ID
  async getById(id: number): Promise<Employee> {
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
    // Создаем копию объекта employee без tax_identifier
    const employeeData = { ...employee };
    if ('tax_identifier' in employeeData) {
      delete employeeData['tax_identifier'];
    }
    // Получаем минимальную зарплату из настроек
    const { data: settingsData } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'min_salary')
      .maybeSingle();
    
    const minSalary = settingsData?.value ? Number(settingsData.value) : 735;
    
    // Добавляем base_salary на основе rate и min_salary
    const employeeWithBaseSalary = {
      ...employeeData,
      base_salary: employeeData.rate * minSalary
    };
    
    const { data, error } = await supabase
      .from('employees')
      .insert(employeeWithBaseSalary)
      .select();
    
    if (error) throw error;
    return data[0] as Employee;
  },

  // Обновить данные сотрудника
  async update(id: number, employee: Partial<Omit<Employee, 'id' | 'created_at'>>): Promise<Employee> {
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
          .select('*')
          .eq('key', 'min_salary')
          .maybeSingle();
        
        const minSalary = settingsData?.value ? Number(settingsData.value) : 735;
        updateData.base_salary = updateData.rate * minSalary;
      }
      
      // Всегда удаляем tax_identifier, так как колонка отсутствует в базе
      if ('tax_identifier' in updateData) {
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
      
      // Обновляем данные сотрудника
      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error updating employee:', error);
        throw error;
      }
      
      return data[0] as Employee;
    } catch (error) {
      console.error('Error in update employee:', error);
      throw error;
    }
  },

  // Удаление сотрудника
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Получить всех активных сотрудников (без уволенных)
  async getActive(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .is('termination_date', null)
      .order('name');
    
    if (error) throw error;
    return (data || []) as Employee[];
  }
};
