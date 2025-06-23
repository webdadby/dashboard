import { supabase } from './client';
import { WorkNorm } from './types';

export const workNormsApi = {
  // Получить все нормы рабочего времени
  async getAll(): Promise<WorkNorm[]> {
    const { data, error } = await supabase
      .from('work_norms')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  // Получить норму рабочего времени для конкретного месяца и года
  async getByYearMonth(year: number, month: number): Promise<WorkNorm | null> {
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
  async upsert(workNorm: Omit<WorkNorm, 'id'>): Promise<WorkNorm> {
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
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('work_norms')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
