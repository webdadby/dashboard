-- Добавление полей для статуса сотрудника
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_secondary_job BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_young_specialist BOOLEAN DEFAULT FALSE;

-- Комментарии к полям
COMMENT ON COLUMN employees.is_remote IS 'Удаленный сотрудник';
COMMENT ON COLUMN employees.is_secondary_job IS 'Не основное место работы';
COMMENT ON COLUMN employees.is_young_specialist IS 'Молодой специалист';
