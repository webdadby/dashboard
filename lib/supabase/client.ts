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
