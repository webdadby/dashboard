import { supabase } from './client';
import { TimesheetEntry, TimesheetEntryWithEmployee } from './types';

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
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Delete a timesheet entry
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('timesheets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Get timesheet entries for a specific employee and month
  async getByEmployeeAndMonth(employeeId: number, year: number, month: number): Promise<TimesheetEntry[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    return this.getByEmployeeAndDateRange(employeeId, startDate, endDate);
  },

  // Bulk upsert timesheet entries
  async bulkUpsert(entries: Omit<TimesheetEntry, 'created_at' | 'updated_at'>[]): Promise<TimesheetEntry[]> {
    if (entries.length === 0) return [];
    
    const entriesToUpsert = entries.map(entry => ({
      ...entry,
      updated_at: new Date().toISOString(),
    }));
    
    const { data, error } = await supabase
      .from('timesheets')
      .upsert(entriesToUpsert)
      .select();
    
    if (error) throw error;
    return data || [];
  }
};
