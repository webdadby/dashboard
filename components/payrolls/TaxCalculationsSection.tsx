import React from 'react';
import { formatCurrency } from './utils';
import { PayrollCalculations } from './types';

interface TaxCalculationsSectionProps {
  calculatedValues: PayrollCalculations;
}

export const TaxCalculationsSection: React.FC<TaxCalculationsSectionProps> = ({
  calculatedValues,
}) => {
  const {
    incomeTax,
    pensionTax,
    fsznTax,
    insuranceTax,
    totalDeductions,
    totalAccrued,
    totalEmployeeCost,
  } = calculatedValues;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Налоговые отчисления</h3>
      
      <div className="rounded-md border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Подоходный налог:</span>
              <span className="text-sm">{formatCurrency(incomeTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Пенсионный налог (1%):</span>
              <span className="text-sm">{formatCurrency(pensionTax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Всего удержано:</span>
              <span className="font-medium">{formatCurrency(totalDeductions)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">ФСЗН (34%):</span>
              <span className="text-sm">{formatCurrency(fsznTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Страховые взносы (0.6%):</span>
              <span className="text-sm">{formatCurrency(insuranceTax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Всего начислено:</span>
              <span className="font-medium">{formatCurrency(totalAccrued)}</span>
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Общая стоимость для работодателя:</span>
            <span className="text-lg font-bold">{formatCurrency(totalEmployeeCost)}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Включает начисления и налоги
          </p>
        </div>
      </div>
    </div>
  );
};
