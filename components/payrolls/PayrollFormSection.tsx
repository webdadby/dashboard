import { Control, FieldValues, Path, UseFormSetValue, UseFormGetValues, UseFormWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export interface PayrollFormSectionProps {
  control: Control<{
    worked_days: number | null;
    bonus: number | null;
    extra_pay: number | null;
    vacation_pay_current: number | null;
    vacation_pay_next: number | null;
    sick_leave_payment: number | null;
    advance_payment: number | null;
    other_deductions: number | null;
    payment_date: string | null;
  }>;
  isLoadingWorkedDays: boolean;
  workNorm: { norm_hours: number } | null;
}

export const PayrollFormSection = ({
  control,
  isLoadingWorkedDays,
  workNorm,
}: PayrollFormSectionProps) => {
  const renderInputField = (field: any, name: string, label: string, type = 'text') => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <Input
          type={type}
          {...field}
          value={field.value === null || field.value === undefined ? '' : field.value}
          onChange={(e) => {
            const value = e.target.value === '' ? '' : e.target.value;
            field.onChange(value === '' ? null : Number(value));
          }}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Данные по зарплате</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <FormField
            control={control}
            name="worked_days"
            render={({ field }) => renderInputField(
              {
                ...field,
                disabled: isLoadingWorkedDays
              }, 
              'worked_days', 
              `Отработано дней${workNorm ? ` (норма: ${workNorm.norm_hours}ч)` : ''}`, 
              'number'
            )}
          />
          {isLoadingWorkedDays && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          )}
        </div>
        <FormField
          control={control}
          name="bonus"
          render={({ field }) => renderInputField(field, 'bonus', 'Премия', 'number')}
        />
        <FormField
          control={control}
          name="extra_pay"
          render={({ field }) => renderInputField(field, 'extra_pay', 'Доплата', 'number')}
        />
        <FormField
          control={control}
          name="vacation_pay_current"
          render={({ field }) => renderInputField(field, 'vacation_pay_current', 'Отпускные тек. мес.', 'number')}
        />
        <FormField
          control={control}
          name="vacation_pay_next"
          render={({ field }) => renderInputField(field, 'vacation_pay_next', 'Отпускные след. мес.', 'number')}
        />
        <FormField
          control={control}
          name="sick_leave_payment"
          render={({ field }) => renderInputField(field, 'sick_leave_payment', 'Больничные', 'number')}
        />
        <FormField
          control={control}
          name="advance_payment"
          render={({ field }) => renderInputField(field, 'advance_payment', 'Аванс', 'number')}
        />
        <FormField
          control={control}
          name="other_deductions"
          render={({ field }) => renderInputField(field, 'other_deductions', 'Прочие удержания', 'number')}
        />
      </div>
    </div>
  );
};
