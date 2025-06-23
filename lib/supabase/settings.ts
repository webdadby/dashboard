import { supabase } from './client';

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
        tax_deduction: 5000,
        salary_payment_date: 10 // День месяца для выплаты зарплаты
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
        tax_deduction: 5000,
        salary_payment_date: 10
      };
    }
  },
  
  // Обновить настройки
  async update(settings: Record<string, any>) {
    // Преобразуем объект настроек в массив записей для вставки
    const settingsArray = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value)
    }));
    
    // Удаляем старые настройки и вставляем новые
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .neq('key', ''); // Удаляем все записи
    
    if (deleteError) throw deleteError;
    
    const { data, error } = await supabase
      .from('settings')
      .insert(settingsArray)
      .select();
    
    if (error) throw error;
    return data;
  },
  
  // Получить отдельную настройку по ключу
  async getByKey(key: string): Promise<string | number | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Запись не найдена
        throw error;
      }
      
      // Пытаемся преобразовать в число, если возможно
      const numValue = Number(data.value);
      return isNaN(numValue) ? data.value : numValue;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }
  },
  
  // Обновить отдельную настройку
  async updateByKey(key: string, value: string | number): Promise<void> {
    try {
      // Проверяем, существует ли настройка
      const { data: existingData } = await supabase
        .from('settings')
        .select('key')
        .eq('key', key)
        .maybeSingle();
      
      if (existingData) {
        // Обновляем существующую настройку
        const { error } = await supabase
          .from('settings')
          .update({ value: String(value) })
          .eq('key', key);
        
        if (error) throw error;
      } else {
        // Создаем новую настройку
        const { error } = await supabase
          .from('settings')
          .insert({ key, value: String(value) });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  }
};
