'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { timesheetsApi } from '@/lib/supabase/timesheets';
import { CalendarIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomDialog } from '@/components/custom-dialog';

import { Employee, Payroll, WorkNorm } from '@/lib/supabase/types';

// Схема валидации для формы начисления зарплаты
const payrollSchema = z.object({
  worked_days: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
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
  // Новые поля для отпускных и больничных
  vacation_pay_current: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
  vacation_pay_next: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
  sick_leave_payment: z.preprocess(
    (val) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
    z.number().min(0, 'Значение должно быть положительным')
  ),
});

type PayrollFormValues = z.infer<typeof payrollSchema>;

interface PayrollSettings {
  min_salary: number;
  income_tax_rate: number;
  pension_tax_rate: number;
}

interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  payroll: Payroll | undefined;
  workNorm: WorkNorm | null;
  year: number;
  month: number;
  // Разворачиваем настройки в отдельные пропсы
  minSalary: number;
  incomeTaxRate: number;
  pensionTaxRate: number;
  fsznRate: number;
  insuranceRate: number;
  benefitAmount: number;
  taxDeduction: number;
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
  pensionTaxRate,
  fsznRate,
  insuranceRate,
  benefitAmount,
  taxDeduction,
  onSave,
}: PayrollDialogProps) {
  console.log('Инициализация PayrollDialog с параметрами:', {
    employee,
    payroll,
    workNorm,
    year,
    month,
    minSalary,
    incomeTaxRate,
    pensionTaxRate,
    fsznRate,
    insuranceRate,
    benefitAmount,
    taxDeduction
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWorkedDays, setIsLoadingWorkedDays] = useState(false);
  const [salaryAccrued, setSalaryAccrued] = useState(0);
  // Настройки уже получены из пропсов
  const [totalAccrued, setTotalAccrued] = useState(0);
  const [incomeTax, setIncomeTax] = useState(0);
  const [pensionTax, setPensionTax] = useState(0);
  
  const [totalDeductions, setTotalDeductions] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  
  // Выводим отладочную информацию о сотруднике и настройках
  console.log('=== Начало инициализации PayrollDialog ===');
  console.log('Сотрудник:', {
    id: employee.id,
    name: employee.name || 'Не указано',
    rate: employee.rate,
    allProperties: Object.keys(employee)
  });
  
  console.log('Настройки расчета:', {
    minSalary,
    incomeTaxRate,
    pensionTaxRate,
    workNorm: workNorm?.working_days
  });
  
  // Инициализируем форму с валидацией Zod
  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollSchema),
    defaultValues: {
      worked_days: payroll?.worked_days || 0,
      bonus: payroll?.bonus || 0,
      extra_pay: payroll?.extra_pay || 0,
      advance_payment: payroll?.advance_payment || 0,
      other_deductions: payroll?.other_deductions || 0,
      vacation_pay_current: payroll?.vacation_pay_current || 0,
      vacation_pay_next: payroll?.vacation_pay_next || 0,
      sick_leave_payment: payroll?.sick_leave_payment || 0,
    },
  });

  // Функция для получения количества отработанных дней из табеля
  const fetchWorkedDaysFromTimesheet = useCallback(async () => {
    if (!employee?.id) return 0;
    
    setIsLoadingWorkedDays(true);
    try {
      // Определяем начало и конец месяца
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      
      console.log('Загрузка данных табеля за период:', { 
        employeeId: employee.id, 
        startDate, 
        endDate,
        month,
        year
      });
      
      // Получаем данные из табеля за выбранный месяц
      const timesheetEntries = await timesheetsApi.getByEmployeeAndDateRange(
        employee.id,
        startDate,
        endDate
      );
      
      console.log('Получены записи табеля:', {
        totalEntries: timesheetEntries.length,
        entries: timesheetEntries.map(e => ({
          id: e.id,
          date: e.work_date,
          status: e.status,
          hours: e.hours_worked
        }))
      });
      
      // Создаем объект для хранения статусов по дням
      const dayStatusMap = new Map<string, string>();
      
      // Сначала обрабатываем все записи, сохраняя статусы для каждого дня
      timesheetEntries.forEach(entry => {
        // Если запись уже есть, оставляем существующий статус, если это не 'work'
        if (!dayStatusMap.has(entry.work_date) || entry.status === 'work') {
          dayStatusMap.set(entry.work_date, entry.status);
        }
      });
      
      // Подсчитываем только дни со статусом 'work'
      let workedDays = 0;
      dayStatusMap.forEach((status, date) => {
        if (status === 'work') {
          workedDays++;
        }
      });
      
      console.log('Подсчет отработанных дней:', {
        totalDays: dayStatusMap.size,
        workedDays,
        statusDistribution: Array.from(dayStatusMap.entries()).reduce((acc, [date, status]) => {
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
      console.log(`Найдено ${workedDays} отработанных дней в табеле за ${month}.${year}`);
      return workedDays;
    } catch (error) {
      console.error('Ошибка при загрузке данных из табеля:', error);
      return 0;
    } finally {
      setIsLoadingWorkedDays(false);
    }
  }, [employee?.id, year, month]);

  // Загружаем данные из табеля при монтировании компонента и при изменении месяца
  useEffect(() => {
    if (open && employee?.id) {
      const loadWorkedDays = async () => {
        const days = await fetchWorkedDaysFromTimesheet();
        // Обновляем значение в форме, только если оно не было изменено вручную
        const currentWorkedDays = form.getValues('worked_days');
        if (currentWorkedDays === 0 || currentWorkedDays === payroll?.worked_days) {
          form.setValue('worked_days', days, { shouldValidate: true });
        }
      };
      loadWorkedDays();
    }
  }, [open, employee?.id, year, month, form, payroll?.worked_days, fetchWorkedDaysFromTimesheet]);
  
  // Функция для расчета начисленной зарплаты по окладу
  const calculateSalaryAccrued = useCallback((workedDays: number): number => {
    if (!workNorm?.working_days) {
      console.error('Недостаточно данных для расчета: workNorm.working_days отсутствует');
      return 0;
    }
    
    // Получаем ставку из данных сотрудника
    const rate = employee.rate || 0;
    
    if (rate <= 0) {
      console.error('Не указана ставка сотрудника (rate)');
      return 0;
    }
    
    // Рассчитываем дневную ставку
    const dailyRate = rate / workNorm.working_days;
    
    // Рассчитываем начисленную зарплату
    const salary = dailyRate * workedDays;
    
    // Округляем до 2 знаков после запятой
    return Math.round(salary * 100) / 100;
  }, [employee.rate, workNorm?.working_days]);
  
  // Выполняем тестовый расчет при монтировании
  useEffect(() => {
    if (workNorm?.working_days) {
      const testSalary = calculateSalaryAccrued(workNorm.working_days);
      console.log(`При ${workNorm.working_days} рабочих днях зарплата:`, testSalary);
    }
  }, [workNorm, calculateSalaryAccrued]);



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
    console.log('--- useEffect для отслеживания изменений формы ---');
    console.log('Текущий workNorm:', workNorm);
    console.log('Текущий employee:', employee);
    console.log('Текущий minSalary:', minSalary);
    
    const subscription = form.watch((values) => {
      console.log('--- Изменение значений формы ---');
      console.log('Новые значения формы:', JSON.stringify(values, null, 2));
      
      const workedDays = Number(values.worked_days || 0);
      const bonus = Number(values.bonus || 0);
      const extraPay = Number(values.extra_pay || 0);
      const advancePayment = Number(values.advance_payment || 0);
      const otherDeductions = Number(values.other_deductions || 0);
      const vacationPayCurrent = Number(values.vacation_pay_current || 0);
      const vacationPayNext = Number(values.vacation_pay_next || 0);
      const sickLeavePayment = Number(values.sick_leave_payment || 0);

      console.log('--- Начало расчета зарплаты ---');
      console.log('Параметры для расчета:', {
        workedDays,
        employeeRate: employee?.rate,
        minSalary,
        workNormWorkingDays: workNorm?.working_days
      });
      
      const calculatedSalaryAccrued = calculateSalaryAccrued(workedDays);
      console.log('--- Результат расчета зарплаты ---');
      console.log('Начисленная зарплата:', calculatedSalaryAccrued);
      // Включаем отпускные и больничные в общий доход
      const calculatedTotalAccrued = roundToTwoDecimals(
        calculatedSalaryAccrued + 
        bonus + 
        extraPay + 
        vacationPayCurrent + 
        vacationPayNext + 
        sickLeavePayment
      );
      
      const calculatedIncomeTax = roundToTwoDecimals(calculateIncomeTax(calculatedTotalAccrued));
      const calculatedPensionTax = roundToTwoDecimals(calculatePensionTax(calculatedTotalAccrued));
      const calculatedTotalDeductions = roundToTwoDecimals(
        calculatedIncomeTax + 
        calculatedPensionTax + 
        advancePayment + 
        otherDeductions
      );
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
        worked_days: Number(data.worked_days),
        bonus: Number(data.bonus || 0),
        extra_pay: Number(data.extra_pay || 0),
        income_tax: incomeTax,
        pension_tax: pensionTax,
        advance_payment: Number(data.advance_payment || 0),
        other_deductions: Number(data.other_deductions || 0),
        // Новые поля для отпускных и больничных
        vacation_pay_current: Number(data.vacation_pay_current || 0),
        vacation_pay_next: Number(data.vacation_pay_next || 0),
        sick_leave_payment: Number(data.sick_leave_payment || 0),
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

  const handleOpenChange = (isOpen: boolean) => {
    // Only allow closing when explicitly calling onOpenChange(false)
    if (!isOpen) {
      // You can add a confirmation dialog here if needed
      onOpenChange(false);
    }
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Обработчик клика вне диалога
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  // Обработчик нажатия клавиши Escape
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    
    if (open) {
      // Добавляем обработчики только когда диалог открыт
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      // Удаляем обработчики при размонтировании
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClickOutside, handleKeyDown]);

  if (!isMounted || !open) return null;

  return (
    <CustomDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={`Начисление зарплаты: ${employee.name}`}
    >
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
            <FormField
              control={form.control}
              name="worked_days"
              render={({ field }) => {
                const workedDays = form.watch('worked_days') || 0;
                const maxDays = workNorm?.working_days || 0;
                const isOverridden = workedDays !== 0 && workedDays !== payroll?.worked_days;
                
                return (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Отработано дней</FormLabel>
                      {isLoadingWorkedDays ? (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Загрузка...
                        </div>
                      ) : isOverridden ? (
                        <div className="flex items-center">
                          <span className="text-xs text-amber-600 mr-2">Ручной ввод</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-blue-600 hover:text-blue-700"
                            onClick={async () => {
                              const days = await fetchWorkedDaysFromTimesheet();
                              form.setValue('worked_days', days, { shouldValidate: true });
                            }}
                          >
                            Сбросить
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={maxDays}
                          step="0.5"
                          className={cn(
                            "pr-16",
                            isOverridden && "border-amber-500 bg-amber-50"
                          )}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const newValue = isNaN(value) ? 0 : Math.min(value, maxDays);
                            field.onChange(newValue);
                            // Recalculate salary when worked days change
                            const salary = calculateSalaryAccrued(newValue);
                            setSalaryAccrued(salary);
                          }}
                        />
                        {maxDays > 0 && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            / {maxDays}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    {maxDays > 0 && workedDays > maxDays && (
                      <p className="text-xs text-destructive mt-1">
                        Превышено максимальное количество рабочих дней в месяце
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <div>
              <div className="mb-2 text-sm font-medium">Начислено по окладу:</div>
              <div>{formatCurrency(salaryAccrued)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <FormField
              control={form.control}
              name="vacation_pay_current"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Выплата отпускных (текущий месяц)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        id="worked_days"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Пересчитываем зарплату при изменении отработанных дней
                          const days = Number(e.target.value) || 0;
                          const salary = calculateSalaryAccrued(days);
                          setSalaryAccrued(salary);
                        }}
                      />
                      {isLoadingWorkedDays && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vacation_pay_next"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Выплата отпускных (следующий месяц)</FormLabel>
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
              name="sick_leave_payment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Начисление по больничному</FormLabel>
                  <FormControl>
                    <Input {...field} type="text" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div></div>
          </div>

          <div className="border-t pt-4">
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
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-2 text-sm font-medium">К ВЫДАЧЕ БЕЗ АВАНСА:</div>
              <div className="font-semibold">{formatCurrency(totalPayable + Number(form.watch('advance_payment') || 0))}</div>
            </div>
            <div></div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Form>
    </CustomDialog>
  );
}
