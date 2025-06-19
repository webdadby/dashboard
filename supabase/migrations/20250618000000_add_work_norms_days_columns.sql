-- Add working_days and holiday_days columns to work_norms table
ALTER TABLE public.work_norms
  ADD COLUMN IF NOT EXISTS working_days INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS holiday_days INTEGER NOT NULL DEFAULT 0;

-- Update existing rows to use reasonable defaults
-- 20 working days is a common default for a month
-- 0 holiday days assumes no holidays by default
UPDATE public.work_norms 
SET 
  working_days = 20,
  holiday_days = 0
WHERE working_days IS NULL OR holiday_days IS NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN public.work_norms.working_days IS 'Number of working days in the month (excluding weekends and holidays)';
COMMENT ON COLUMN public.work_norms.holiday_days IS 'Number of holiday days in the month that fall on working days';

-- Update row level security if needed (adjust as per your RLS policies)
-- This ensures the new columns are included in any existing RLS policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'work_norms'
  ) THEN
    -- If you have RLS policies, you may need to update them to include the new columns
    -- Example:
    -- DROP POLICY IF EXISTS your_policy_name ON public.work_norms;
    -- CREATE POLICY your_policy_name ON public.work_norms
    --   FOR ALL USING (your_condition_here);
    NULL; -- Remove this line when adding actual policy updates
  END IF;
END $$;
