import { Button } from '@/components/ui/button';
import { formatCurrency, roundToTwoDecimals } from './utils';
import { PayrollRowProps } from './types';

export function PayrollRow({
  employee,
  payroll,
  workNorm,
  minSalary,
  incomeTaxRate,
  onEdit,
}: PayrollRowProps) {
  // Use values directly from the database
  const normHours = roundToTwoDecimals(workNorm?.norm_hours || 0);
  const workedHours = roundToTwoDecimals(payroll?.worked_hours || 0);
  const salary = roundToTwoDecimals(payroll?.salary || (employee.rate * minSalary));
  
  // Use values from the database if available
  const salaryAccrued = roundToTwoDecimals(payroll?.salary_accrued || 0);
  const bonus = roundToTwoDecimals(payroll?.bonus || 0);
  const extraPay = roundToTwoDecimals(payroll?.extra_pay || 0);
  const totalAccrued = roundToTwoDecimals(payroll?.total_accrued || 0);
  
  // Use tax values from the database
  const incomeTax = roundToTwoDecimals(payroll?.income_tax || 0);
  const pensionTax = roundToTwoDecimals(payroll?.pension_tax || 0);
  const advancePayment = roundToTwoDecimals(payroll?.advance_payment || 0);
  const otherDeductions = roundToTwoDecimals(payroll?.other_deductions || 0);
  const totalDeductions = roundToTwoDecimals(payroll?.total_deductions || 0);
  const totalPayable = roundToTwoDecimals(payroll?.total_payable || 0);
  // Переименовано из payableWithoutSalary в payableWithoutAdvance
  // Формула: К ВЫДАЧЕ - АВАНС (т.е. сумма, которая осталась к выдаче после вычета аванса)
  const payableWithoutAdvance = roundToTwoDecimals(payroll?.payable_without_salary || (totalPayable - advancePayment));

  return (
    <tr>
      <td>{employee.name}</td>
      <td>{normHours}</td>
      <td>{workedHours}</td>
      <td>{salary}</td>
      <td>{salaryAccrued}</td>
      <td>{bonus}</td>
      <td>{extraPay}</td>
      <td className="font-semibold">{totalAccrued}</td>
      <td>{incomeTax}</td>
      <td>{pensionTax}</td>
      <td>{advancePayment}</td>
      <td>{otherDeductions}</td>
      <td className="font-semibold">{totalDeductions}</td>
      <td className="font-bold">{totalPayable}</td>
      <td className="font-semibold">{payableWithoutAdvance}</td>
      <td>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEdit(employee)}
        >
          {payroll ? 'Изменить' : 'Добавить'}
        </Button>
      </td>
    </tr>
  );
}
