import React from 'react';
import { Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { PayrollFormValues } from './types';

interface PaymentDetailsSectionProps {
  control: Control<PayrollFormValues>;
  isLoadingKpiBonus?: boolean;
  kpiTotalBonus?: number;
  onKpiBonusClick?: () => void;
}

export const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({
  control,
  isLoadingKpiBonus,
  kpiTotalBonus,
  onKpiBonusClick,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Детали выплат</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Премия */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bonus">Премия</Label>
            <div className="flex items-center space-x-2">
              {isLoadingKpiBonus ? (
                <span className="text-sm text-gray-500">Загрузка KPI...</span>
              ) : kpiTotalBonus && kpiTotalBonus > 0 ? (
                <button
                  type="button"
                  onClick={onKpiBonusClick}
                  className="text-sm text-blue-600 hover:underline"
                >
                  KPI: {kpiTotalBonus?.toFixed(2)} руб.
                </button>
              ) : null}
            </div>
          </div>
          <FormField
            control={control}
            name="bonus"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="bonus"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Доплата */}
        <div className="space-y-2">
          <Label htmlFor="extra_pay">Доплата</Label>
          <FormField
            control={control}
            name="extra_pay"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="extra_pay"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Отпускные за текущий месяц */}
        <div className="space-y-2">
          <Label htmlFor="vacation_pay_current">Отпускные (текущий месяц)</Label>
          <FormField
            control={control}
            name="vacation_pay_current"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="vacation_pay_current"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Отпускные за следующий месяц */}
        <div className="space-y-2">
          <Label htmlFor="vacation_pay_next">Отпускные (следующий месяц)</Label>
          <FormField
            control={control}
            name="vacation_pay_next"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="vacation_pay_next"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Оплата больничного */}
        <div className="space-y-2">
          <Label htmlFor="sick_leave_payment">Оплата больничного</Label>
          <FormField
            control={control}
            name="sick_leave_payment"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="sick_leave_payment"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Аванс */}
        <div className="space-y-2">
          <Label htmlFor="advance_payment">Аванс</Label>
          <FormField
            control={control}
            name="advance_payment"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="advance_payment"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Прочие удержания */}
        <div className="space-y-2">
          <Label htmlFor="other_deductions">Прочие удержания</Label>
          <FormField
            control={control}
            name="other_deductions"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="other_deductions"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Дата выплаты */}
        <div className="space-y-2">
          <Label htmlFor="payment_date">Дата выплаты</Label>
          <FormField
            control={control}
            name="payment_date"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    id="payment_date"
                    type="date"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};
