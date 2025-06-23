import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Для работы с Supabase необходимо указать URL и ключ API
// В реальном проекте эти значения должны быть в .env файле
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton instance
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

// Функция для создания клиента Supabase (singleton pattern)
export function createClient() {
  if (supabaseInstance) return supabaseInstance;
  
  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  
  return supabaseInstance;
}

// Создаем клиент Supabase для использования в API функциях
export const supabase = createClient();
