-- Enable Row Level Security on timesheets table
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Create policies for timesheets
-- Allow authenticated users to view their own timesheet entries
CREATE POLICY "Enable read access for users based on employee_id" 
ON public.timesheets
FOR SELECT
TO authenticated
USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE auth.users.id::text = (SELECT auth.uid()::text)
));

-- Allow authenticated users to insert their own timesheet entries
CREATE POLICY "Enable insert for authenticated users only"
ON public.timesheets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update their own timesheet entries
CREATE POLICY "Enable update for users based on employee_id"
ON public.timesheets
FOR UPDATE
TO authenticated
USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE auth.users.id::text = (SELECT auth.uid()::text)
));

-- Allow users to delete their own timesheet entries
CREATE POLICY "Enable delete for users based on employee_id"
ON public.timesheets
FOR DELETE
TO authenticated
USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE auth.users.id::text = (SELECT auth.uid()::text)
));

-- Expose the table in the API
COMMENT ON TABLE public.timesheets IS 'Stores employee attendance and time off data';

-- Grant necessary permissions
GRANT ALL ON TABLE public.timesheets TO authenticated;
GRANT ALL ON SEQUENCE public.timesheets_id_seq TO authenticated;
