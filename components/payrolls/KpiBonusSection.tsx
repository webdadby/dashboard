import React from 'react';
import { Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Loader2, Award } from 'lucide-react';
import { PayrollFormValues } from './types';

interface KpiBonusSectionProps {
  control: Control<PayrollFormValues>;
  kpiTotalBonus: number;
  isLoadingKpiBonus: boolean;
  onKpiBonusClick: () => void;
}

export const KpiBonusSection: React.FC<KpiBonusSectionProps> = ({
  control,
  kpiTotalBonus,
  isLoadingKpiBonus,
  onKpiBonusClick,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">KPI Бонусы</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onKpiBonusClick}
          disabled={isLoadingKpiBonus}
        >
          {isLoadingKpiBonus ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Award className="mr-2 h-4 w-4" />
              {kpiTotalBonus > 0 ? 'Обновить KPI' : 'Загрузить KPI'}
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bonus">Бонус KPI</Label>
            {kpiTotalBonus > 0 && (
              <span className="text-sm text-green-600">
                Доступно: {kpiTotalBonus.toFixed(2)} руб.
              </span>
            )}
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
                    placeholder="Введите сумму бонуса"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? '' : Number(value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {kpiTotalBonus > 0 && (
            <p className="text-sm text-muted-foreground">
              Введите сумму бонуса из доступных {kpiTotalBonus.toFixed(2)} руб.
            </p>
          )}
        </div>
        
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
                    placeholder="Дополнительные выплаты"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? '' : Number(value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-sm text-muted-foreground">
            Прочие начисления (премии, надбавки)
          </p>
        </div>
      </div>
    </div>
  );
};
