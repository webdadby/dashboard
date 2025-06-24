import { formatCurrency } from './utils';

interface PayrollTotalsProps {
  calculatedValues: {
    fsznTax: number;
    insuranceTax: number;
    totalEmployeeCost: number;
  };
  fsznRate: number;
  insuranceRate: number;
  className?: string;
}

export const PayrollTotals = ({
  calculatedValues,
  fsznRate,
  insuranceRate,
  className = '',
}: PayrollTotalsProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="font-medium">Итоги</h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-sm py-2 border-b">
          <span className="text-muted-foreground">ФСЗН ({fsznRate}%):</span>
          <span>{formatCurrency(calculatedValues.fsznTax)}</span>
        </div>
        <div className="flex justify-between text-sm py-2 border-b">
          <span className="text-muted-foreground">Страховой взнос ({insuranceRate}%):</span>
          <span>{formatCurrency(calculatedValues.insuranceTax)}</span>
        </div>
        <div className="flex justify-between font-semibold py-2 border-b bg-muted/30">
          <span>Стоимость сотрудника:</span>
          <span>{formatCurrency(calculatedValues.totalEmployeeCost)}</span>
        </div>
      </div>
    </div>
  );
};
