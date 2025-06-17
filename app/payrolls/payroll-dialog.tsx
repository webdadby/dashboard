'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Employee, Payroll, WorkNorm } from '@/lib/supabase';

// Схема валидации для формы начисления зарплаты
const payrollSchema = z.object({
  worked_hours: z.preprocess(
    (val) => (val === '' ? null : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
  bonus: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
  extra_pay: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
  advance_payment: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
  other_deductions: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
});

type PayrollFormValues = z.infer<typeof payrollSchema>;

interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  payroll: Payroll | undefined;
  workNorm: WorkNorm | null;
  year: number;
  month: number;
  minSalary: number;
  incomeTaxRate: number;
  onSave: (payroll: any) => void;
}

export function PayrollDialog({
  open,
  onOpenChange,
  employee,
  payroll,
  workNorm,
  year,
  month,
  minSalary,
  incomeTaxRate,
  onSave,
}: PayrollDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salaryAccrued, setSalaryAccrued] = useState(0);
  const [totalAccrued, setTotalAccrued] = useState(0);
  const [incomeTax, setIncomeTax] = useState(0);
  const [pensionTax, setPensionTax] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);

  // Инициализируем форму с валидацией Zod
  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollSchema),
    defaultValues: {
      worked_hours: payroll?.worked_hours || 0,
      bonus: payroll?.bonus || 0,
      extra_pay: payroll?.extra_pay || 0,
      advance_payment: payroll?.advance_payment || 0,
      other_deductions: payroll?.other_deductions || 0,
    },
  });

  // Функция для расчета начисленной зарплаты по окладу
  const calculateSalaryAccrued = (workedHours: number) => {
    if (!workNorm || !workNorm.norm_hours) return 0;
    const fullSalary = employee.rate * minSalary;
    return (fullSalary / workNorm.norm_hours) * workedHours;
  };

  // Функция для расчета подоходного налога
  const calculateIncomeTax = (totalAccrued: number) => {
    return totalAccrued * (incomeTaxRate / 100);
  };

  // Функция для расчета пенсионного взноса (1% от начисленной суммы)
  const calculatePensionTax = (totalAccrued: number) => {
    return totalAccrued * 0.01;
  };

  // Функция для форматирования денежных значений
  // Округление числа до 2 знаков после запятой
  const roundToTwoDecimals = (value: number) => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  };
  
  const formatCurrency = (value: number) => {
    // Сначала округляем значение до 2 знаков после запятой
    const roundedValue = roundToTwoDecimals(value);
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'BYN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundedValue);
  };

  // Обновление расчетов при изменении значений формы
  useEffect(() => {
    const subscription = form.watch((values) => {
      const workedHours = Number(values.worked_hours || 0);
      const bonus = Number(values.bonus || 0);
      const extraPay = Number(values.extra_pay || 0);
      const advancePayment = Number(values.advance_payment || 0);
      const otherDeductions = Number(values.other_deductions || 0);

      const calculatedSalaryAccrued = calculateSalaryAccrued(workedHours);
      const calculatedTotalAccrued = roundToTwoDecimals(calculatedSalaryAccrued + bonus + extraPay);
      const calculatedIncomeTax = roundToTwoDecimals(calculateIncomeTax(calculatedTotalAccrued));
      const calculatedPensionTax = roundToTwoDecimals(calculatePensionTax(calculatedTotalAccrued));
      const calculatedTotalDeductions = roundToTwoDecimals(calculatedIncomeTax + calculatedPensionTax + advancePayment + otherDeductions);
      const calculatedTotalPayable = roundToTwoDecimals(calculatedTotalAccrued - calculatedTotalDeductions);

      setSalaryAccrued(calculatedSalaryAccrued);
      setTotalAccrued(calculatedTotalAccrued);
      setIncomeTax(calculatedIncomeTax);
      setPensionTax(calculatedPensionTax);
      setTotalDeductions(calculatedTotalDeductions);
      setTotalPayable(calculatedTotalPayable);
    });

    return () => subscription.unsubscribe();
  }, [form.watch, workNorm, employee.rate, minSalary, incomeTaxRate]);

  // Обработчик отправки формы
  const onSubmit = async (data: PayrollFormValues) => {
    setIsSubmitting(true);
    try {
      const payrollData = {
        employee_id: employee.id,
        year,
        month,
        worked_hours: Number(data.worked_hours),
        bonus: Number(data.bonus || 0),
        extra_pay: Number(data.extra_pay || 0),
        income_tax: incomeTax,
        pension_tax: pensionTax,
        advance_payment: Number(data.advance_payment || 0),
        other_deductions: Number(data.other_deductions || 0),
        // Сохраняем все расчетные значения в базу данных
        salary: employee.rate * minSalary,
        salary_accrued: salaryAccrued,
        total_accrued: totalAccrued,
        total_deductions: totalDeductions,
        total_payable: totalPayable,
        // К ВЫДАЧЕ БЕЗ АВАНСА: К ВЫДАЧЕ - АВАНС
        payable_without_salary: roundToTwoDecimals(totalPayable - Number(data.advance_payment || 0)),
      };
      
      await onSave(payrollData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Начисление зарплаты: {employee.name}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-sm font-medium">Сотрудник:</div>
                <div>{employee.name}</div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Оклад:</div>
                <div>{formatCurrency(employee.rate * minSalary)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-sm font-medium">Норма часов:</div>
                <div>{workNorm?.norm_hours || 'Не установлена'}</div>
              </div>
              <FormField
                control={form.control}
                name="worked_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Отработано часов</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-sm font-medium">Начислено по окладу:</div>
                <div>{formatCurrency(salaryAccrued)}</div>
              </div>
              <FormField
                control={form.control}
                name="bonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Премия</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="extra_pay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Доплата</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <div className="mb-2 text-sm font-medium">ВСЕГО НАЧИСЛЕНО:</div>
                <div className="font-semibold">{formatCurrency(totalAccrued)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-sm font-medium">Подоходный налог:</div>
                <div>{formatCurrency(incomeTax)}</div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Пенсионный взнос:</div>
                <div>{formatCurrency(pensionTax)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="advance_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Аванс</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="other_deductions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Прочие удержания</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-sm font-medium">ВСЕГО УДЕРЖАНО:</div>
                <div className="font-semibold">{formatCurrency(totalDeductions)}</div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">К ВЫДАЧЕ:</div>
                <div className="font-bold">{formatCurrency(totalPayable)}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-sm font-medium">К ВЫДАЧЕ БЕЗ АВАНСА:</div>
                <div className="font-semibold">{formatCurrency(totalPayable + Number(form.watch('advance_payment') || 0))}</div>
              </div>
              <div></div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
