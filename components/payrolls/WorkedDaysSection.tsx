import React from 'react';
import { Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Loader2, Calendar } from 'lucide-react';
import { PayrollFormValues, WorkNorm } from './types';

interface WorkedDaysSectionProps {
  control: Control<PayrollFormValues>;
  workNorm: WorkNorm | null;
  isLoadingWorkedDays: boolean;
  onFetchWorkedDays: () => Promise<void>;
}

export const WorkedDaysSection: React.FC<WorkedDaysSectionProps> = ({
  control,
  workNorm,
  isLoadingWorkedDays,
  onFetchWorkedDays,
}) => {
  // Get the number of working days from workNorm or use 0 if workNorm is null
  const workingDays = workNorm?.working_days ?? 0;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Отработанные дни</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFetchWorkedDays}
          disabled={isLoadingWorkedDays || !workNorm}
        >
          {isLoadingWorkedDays ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Загрузить из табеля
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="worked_days">Отработано дней</Label>
          <FormField
            control={control}
            name="worked_days"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="worked_days"
                    type="number"
                    min="0"
                    max={workingDays}
                    step="0.5"
                    value={field.value === null ? '' : field.value}
                    onChange={(e) => {
                      let value = e.target.value === '' ? null : Number(e.target.value);
                      if (value !== null && value > workingDays) {
                        value = workingDays;
                      }
                      field.onChange(value);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    disabled={field.disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Рабочих дней в месяце</Label>
          <Input
            type="text"
            value={workingDays}
            disabled
            className="bg-gray-100"
          />
          <p className="text-sm text-muted-foreground">
            Норма: {workingDays} дней
          </p>
        </div>
      </div>
    </div>
  );
};
