import React from 'react';
import { formatCurrency } from './utils';

interface PayrollSummaryProps {
  salaryAccrued: number;
  totalAccrued: number;
  incomeTax: number;
  pensionTax: number;
  totalDeductions: number;
  totalPayable: number;
  fsznTax: number;
  insuranceTax: number;
  totalEmployeeCost: number;
  payableWithoutSalary: number;
  isTaxBenefitApplied: boolean;
}

export const PayrollSummary: React.FC<PayrollSummaryProps> = ({
  salaryAccrued,
  totalAccrued,
  incomeTax,
  pensionTax,
  totalDeductions,
  totalPayable,
  fsznTax,
  insuranceTax,
  totalEmployeeCost,
  payableWithoutSalary,
  isTaxBenefitApplied,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Начислено за отработанные дни:</span>
            <span className="font-medium">{formatCurrency(salaryAccrued)}</span>
          </div>
          <div className="flex justify-between">
            <span>Итого начислено:</span>
            <span className="font-medium">{formatCurrency(totalAccrued)}</span>
          </div>
          {isTaxBenefitApplied && (
            <div className="text-sm text-yellow-600">
              * Учтён необлагаемый минимум
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Подоходный налог:</span>
            <span className="text-red-600">-{formatCurrency(incomeTax)}</span>
          </div>
          <div className="flex justify-between">
            <span>Пенсионный налог (1%):</span>
            <span className="text-red-600">-{formatCurrency(pensionTax)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Всего удержано:</span>
            <span className="text-red-600">-{formatCurrency(totalDeductions)}</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between text-lg font-bold">
          <span>К выплате:</span>
          <span>{formatCurrency(totalPayable)}</span>
        </div>
        <div className="text-sm text-gray-500">
          Без учета оклада: {formatCurrency(payableWithoutSalary)}
        </div>
      </div>

      <div className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>ФСЗН ({fsznTax > 0 ? (fsznTax / totalAccrued * 100).toFixed(1) : '0'}%):</span>
          <span>{formatCurrency(fsznTax)}</span>
        </div>
        <div className="flex justify-between">
          <span>Страховые взносы ({insuranceTax > 0 ? (insuranceTax / totalAccrued * 100).toFixed(1) : '0'}%):</span>
          <span>{formatCurrency(insuranceTax)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Общая стоимость для работодателя:</span>
          <span>{formatCurrency(totalEmployeeCost)}</span>
        </div>
      </div>
    </div>
  );
};
