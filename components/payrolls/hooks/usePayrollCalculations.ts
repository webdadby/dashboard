import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { PayrollFormValues } from '../types';
import { roundToTwoDecimals } from '../utils';

interface UsePayrollCalculationsProps {
  form: UseFormReturn<PayrollFormValues>;
  salary: number;
  workNormDays: number;
  incomeTaxRate: number;
  fsznRate: number;
  insuranceRate: number;
  benefitAmount: number;
  taxDeduction: number;
}

/**
 * Хук для расчета зарплаты и налогов
 */
export function usePayrollCalculations({
  form,
  salary,
  workNormDays,
  incomeTaxRate,
  fsznRate,
  insuranceRate,
  benefitAmount,
  taxDeduction
}: UsePayrollCalculationsProps) {
  const [calculatedValues, setCalculatedValues] = useState({
    salaryAccrued: 0,
    totalAccrued: 0,
    incomeTax: 0,
    pensionTax: 0,
    totalDeductions: 0,
    totalPayable: 0,
    fsznTax: 0,
    insuranceTax: 0,
    totalEmployeeCost: 0,
    payableWithoutSalary: 0,
  });

  // Функция для расчета начисленной зарплаты
  const calculateSalaryAccrued = (workedDays: number): number => {
    if (!workNormDays || workNormDays === 0) return 0;
    return roundToTwoDecimals((salary / workNormDays) * workedDays);
  };

  // Функция для расчета подоходного налога
  const calculateIncomeTax = (totalAccrued: number): number => {
    // Если есть налоговый вычет, уменьшаем базу для расчета налога
    const taxBase = Math.max(0, totalAccrued - taxDeduction);
    return roundToTwoDecimals(taxBase * incomeTaxRate);
  };

  // Функция для расчета пенсионного налога
  const calculatePensionTax = (totalAccrued: number): number => {
    return roundToTwoDecimals(totalAccrued * 0.01); // 1% от общей суммы начислений
  };

  // Функция для расчета ФСЗН
  const calculateFsznTax = (totalAccrued: number): number => {
    return roundToTwoDecimals(totalAccrued * fsznRate);
  };

  // Функция для расчета страховых взносов
  const calculateInsuranceTax = (totalAccrued: number): number => {
    return roundToTwoDecimals(totalAccrued * insuranceRate);
  };

  // Функция для расчета общей стоимости сотрудника для работодателя
  const calculateTotalEmployeeCost = (totalAccrued: number, fsznTax: number, insuranceTax: number): number => {
    return roundToTwoDecimals(totalAccrued + fsznTax + insuranceTax);
  };

  // Функция для расчета суммы к выплате без учета оклада (только премии, отпускные и т.д.)
  const calculatePayableWithoutSalary = (
    bonus: number,
    extraPay: number,
    vacationPayCurrent: number,
    vacationPayNext: number,
    sickLeavePayment: number,
    advancePayment: number,
    otherDeductions: number,
    incomeTax: number,
    pensionTax: number
  ): number => {
    const totalAccruedWithoutSalary = bonus + extraPay + vacationPayCurrent + vacationPayNext + sickLeavePayment;
    const totalDeductions = advancePayment + otherDeductions + incomeTax + pensionTax;
    return roundToTwoDecimals(totalAccruedWithoutSalary - totalDeductions);
  };

  // Эффект для расчета зарплаты при изменении формы
  useEffect(() => {
    const subscription = form.watch((value) => {
      const workedDays = value.worked_days || 0;
      const bonus = value.bonus || 0;
      const extraPay = value.extra_pay || 0;
      const vacationPayCurrent = value.vacation_pay_current || 0;
      const vacationPayNext = value.vacation_pay_next || 0;
      const sickLeavePayment = value.sick_leave_payment || 0;
      const advancePayment = value.advance_payment || 0;
      const otherDeductions = value.other_deductions || 0;

      // Расчет начисленной зарплаты
      const salaryAccrued = calculateSalaryAccrued(workedDays);

      // Расчет общей суммы начислений
      const totalAccrued = salaryAccrued + bonus + extraPay + vacationPayCurrent + vacationPayNext + sickLeavePayment + benefitAmount;

      // Расчет налогов
      const incomeTax = calculateIncomeTax(totalAccrued);
      const pensionTax = calculatePensionTax(totalAccrued);

      // Расчет общей суммы удержаний
      const totalDeductions = incomeTax + pensionTax + advancePayment + otherDeductions;

      // Расчет суммы к выплате
      const totalPayable = totalAccrued - totalDeductions;

      // Расчет налогов работодателя
      const fsznTax = calculateFsznTax(totalAccrued);
      const insuranceTax = calculateInsuranceTax(totalAccrued);

      // Расчет общей стоимости сотрудника
      const totalEmployeeCost = calculateTotalEmployeeCost(totalAccrued, fsznTax, insuranceTax);

      // Расчет суммы к выплате без учета оклада
      const payableWithoutSalary = calculatePayableWithoutSalary(
        bonus,
        extraPay,
        vacationPayCurrent,
        vacationPayNext,
        sickLeavePayment,
        advancePayment,
        otherDeductions,
        incomeTax,
        pensionTax
      );

      // Обновление рассчитанных значений
      setCalculatedValues({
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
      });

      // Мы не обновляем скрытые поля формы, так как они не определены в PayrollFormValues
      // Вместо этого мы просто обновляем состояние calculatedValues
    });

    return () => subscription.unsubscribe();
  }, [form, salary, workNormDays, incomeTaxRate, fsznRate, insuranceRate, benefitAmount, taxDeduction]);

  return calculatedValues;
}
