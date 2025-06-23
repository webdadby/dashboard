'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { timesheetsApi } from '@/lib/supabase/timesheets';
import { kpiResultsApi, kpiMetricsApi, kpiCalculations } from '@/lib/supabase/kpi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomDialog } from '@/components/custom-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Payroll, WorkNorm } from '@/lib/supabase/types';
import { PayrollFormValues, PayrollDialogProps } from './types';
import { formatCurrency, roundToTwoDecimals } from './utils';

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
  fsznRate,
  insuranceRate,
  benefitAmount,
  taxDeduction,
  onSave,
}: PayrollDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingWorkedDays, setIsLoadingWorkedDays] = useState(false);
  // Remove individual state setters since we'll calculate everything reactively
  const [calculatedValues, setCalculatedValues] = useState({
    salaryAccrued: 0,
    totalAccrued: 0,
    incomeTax: 0,
    pensionTax: 0,
    totalDeductions: 0,
    totalPayable: 0,
    payableWithoutSalary: 0,
    fsznTax: 0,
    insuranceTax: 0,
    totalEmployeeCost: 0,
    isTaxBenefitApplied: false
  });
  
  // Состояние для хранения суммы KPI-премий
  const [kpiTotalBonus, setKpiTotalBonus] = useState<number>(0);
  const [isLoadingKpiBonus, setIsLoadingKpiBonus] = useState<boolean>(false);

  // Get employee's salary - use base_salary if set, otherwise calculate from rate and minSalary
  const fullSalary = employee.base_salary || 0;
  
  // Загрузка данных о KPI-премиях для сотрудника
  useEffect(() => {
    async function loadKpiBonus() {
      if (!employee?.id || !year || !month) return;
      
      setIsLoadingKpiBonus(true);
      try {
        // Формируем период в формате YYYY-MM-DD (первый день месяца)
        const period = `${year}-${month.toString().padStart(2, '0')}-01`;
        
        // Получаем все метрики
        const allMetrics = await kpiMetricsApi.getAll();
        
        // Получаем результаты KPI для сотрудника за период
        const kpiResults = await kpiResultsApi.getByEmployeeAndPeriod(employee.id, period);
        
        // Создаем карту результатов для быстрого доступа
        const resultsMap: Record<number, number> = {};
        kpiResults.forEach(result => {
          if (result.metric_id) {
            resultsMap[result.metric_id] = result.value || 0;
          }
        });
        
        // Рассчитываем общую сумму премии
        let totalBonus = 0;
        allMetrics.forEach(metric => {
          if (metric.id && resultsMap[metric.id] !== undefined) {
            const value = resultsMap[metric.id];
            
            // Рассчитываем бонус в зависимости от типа метрики
            if (metric.type === 'tiered') {
              totalBonus += kpiCalculations.calculateTieredBonus(value, metric.tiers || []);
            } else if (metric.type === 'multiply') {
              totalBonus += kpiCalculations.calculateMultiplyBonus(value, metric.base_rate || 0);
            } else if (metric.type === 'percentage') {
              totalBonus += kpiCalculations.calculatePercentageBonus(value, 100, metric.base_rate || 0);
            } else if (metric.type === 'sum_percentage') {
              totalBonus += value * (metric.base_rate || 0) / 100;
            }
          }
        });
        
        setKpiTotalBonus(totalBonus);
      } catch (error) {
        console.error('Ошибка при загрузке данных о KPI-премиях:', error);
        setKpiTotalBonus(0);
      } finally {
        setIsLoadingKpiBonus(false);
      }
    }
    
    loadKpiBonus();
  }, [employee.id, year, month]);
  
  // Получаем отработанные дни из табеля
  const fetchWorkedDaysFromTimesheet = useCallback(async () => {
    if (!employee?.id) return 0;
    
    setIsLoadingWorkedDays(true);
    try {
      // Получаем начало и конец месяца
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      
      // Получаем дату увольнения сотрудника, если есть
      const terminationDate = employee.termination_date 
        ? new Date(employee.termination_date) 
        : null;
      
      console.log('Получение данных табеля за период:', { 
        employeeId: employee.id, 
        startDate, 
        endDate,
        terminationDate,
        month,
        year
      });
      
      // Получаем записи табеля за месяц
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
        }))
      });
      
      // Создаем карту для хранения статусов по датам (с приоритетом 'work')
      const dayStatusMap = new Map<string, string>();
      
      // Обрабатываем все записи, сохраняя статус 'work' при его наличии
      timesheetEntries.forEach(entry => {
        const entryDate = new Date(entry.work_date);
        
        // Пропускаем дни после увольнения
        if (terminationDate && entryDate > terminationDate) {
          return;
        }
        
        // Сохраняем статус, если его еще нет или если это 'work'
        if (!dayStatusMap.has(entry.work_date) || entry.status === 'work') {
          dayStatusMap.set(entry.work_date, entry.status);
        }
      });
      
      // Считаем только дни со статусом 'work'
      let workedDays = 0;
      dayStatusMap.forEach((status, date) => {
        if (status === 'work') {
          workedDays++;
        }
      });
      
      console.log('Расчет отработанных дней:', {
        totalDays: dayStatusMap.size,
        workedDays,
        statusDistribution: Array.from(dayStatusMap.entries()).reduce((acc, [date, status]) => {
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        terminationDate: terminationDate?.toISOString()
      });
      
      console.log(`Найдено ${workedDays} отработанных дней в табеле за ${month}.${year}`);
      return workedDays;
    } catch (error) {
      console.error('Error fetching timesheet data:', error);
      return 0;
    } finally {
      setIsLoadingWorkedDays(false);
    }
  }, [employee?.id, year, month]);
  
  // Calculate default advance payment as 40% of salary
  const defaultAdvancePayment = payroll?.advance_payment !== undefined ? payroll.advance_payment : Math.round(fullSalary * 0.4);
  
  // Initialize form with validation
  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(
      z.object({
        worked_days: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
        bonus: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
        extra_pay: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
        vacation_pay_current: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
        vacation_pay_next: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
        sick_leave_payment: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
        advance_payment: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
        other_deductions: z.preprocess(
          (val: unknown) => (val === '' ? 0 : Number(String(val).replace(',', '.'))),
          z.number().min(0, 'Значение должно быть положительным')
        ),
      })
    ),
    defaultValues: {
      worked_days: payroll?.worked_days !== undefined ? payroll.worked_days : workNorm?.working_days || 0,
      bonus: payroll?.bonus !== undefined ? payroll.bonus : 0,
      extra_pay: payroll?.extra_pay !== undefined ? payroll.extra_pay : 0,
      vacation_pay_current: payroll?.vacation_pay_current !== undefined ? payroll.vacation_pay_current : 0,
      vacation_pay_next: payroll?.vacation_pay_next !== undefined ? payroll.vacation_pay_next : 0,
      sick_leave_payment: payroll?.sick_leave_payment !== undefined ? payroll.sick_leave_payment : 0,
      advance_payment: payroll?.advance_payment !== undefined ? payroll.advance_payment : defaultAdvancePayment,
      other_deductions: payroll?.other_deductions !== undefined ? payroll.other_deductions : 0,
    },
  });
  
  // Fetch worked days when component mounts or when employee/month/year changes
  useEffect(() => {
    const loadWorkedDays = async () => {
      const days = await fetchWorkedDaysFromTimesheet();
      // Only update if we're not editing an existing payroll
      if (!payroll?.id) {
        form.setValue('worked_days', days);
      }
    };
    
    loadWorkedDays();
  }, [fetchWorkedDaysFromTimesheet, payroll?.id, form]);
  
  // Обновляем значения формы при изменении payroll
  useEffect(() => {
    console.log('PayrollDialog initialized with tax benefit parameters:', { 
      benefitAmount, 
      taxDeduction,
      incomeTaxRate
    });
    
    if (payroll) {
      form.reset({
        worked_days: payroll.worked_days !== undefined ? payroll.worked_days : workNorm?.working_days || 0,
        bonus: payroll.bonus !== undefined ? payroll.bonus : 0,
        extra_pay: payroll.extra_pay !== undefined ? payroll.extra_pay : 0,
        vacation_pay_current: payroll.vacation_pay_current !== undefined ? payroll.vacation_pay_current : 0,
        vacation_pay_next: payroll.vacation_pay_next !== undefined ? payroll.vacation_pay_next : 0,
        sick_leave_payment: payroll.sick_leave_payment !== undefined ? payroll.sick_leave_payment : 0,
        advance_payment: payroll.advance_payment !== undefined ? payroll.advance_payment : defaultAdvancePayment,
        other_deductions: payroll.other_deductions !== undefined ? payroll.other_deductions : 0,
      });
      
      const salaryAccrued = calculateSalaryAccrued(payroll.worked_days || 0);
      const totalAccrued = roundToTwoDecimals(
        salaryAccrued + (payroll.bonus || 0) + (payroll.extra_pay || 0)
      );
      
      // Используем функцию calculateIncomeTax с учетом льготы
      const { tax: incomeTaxAmount, isTaxBenefitApplied } = calculateIncomeTax(totalAccrued);
      const incomeTax = roundToTwoDecimals(incomeTaxAmount);
      
      const pensionTax = roundToTwoDecimals(totalAccrued * 0.01);
      const totalDeductions = roundToTwoDecimals(
        incomeTax + pensionTax + (payroll.other_deductions || 0)
      );
      const totalPayable = roundToTwoDecimals(totalAccrued - totalDeductions);
      const payableWithoutSalary = roundToTwoDecimals(totalPayable - (payroll.advance_payment || 0));
      const fsznTax = roundToTwoDecimals(totalAccrued * (fsznRate / 100));
      const insuranceTax = roundToTwoDecimals(totalAccrued * (insuranceRate / 100));
      const totalEmployeeCost = roundToTwoDecimals(
        totalPayable + fsznTax + insuranceTax
      );
      
      console.log('Initial calculation with payroll data:', {
        totalAccrued,
        incomeTax,
        isTaxBenefitApplied
      });
      
      setCalculatedValues({
        salaryAccrued,
        totalAccrued,
        incomeTax,
        pensionTax,
        totalDeductions,
        totalPayable,
        payableWithoutSalary,
        fsznTax,
        insuranceTax,
        totalEmployeeCost,
        isTaxBenefitApplied
      });
    }
  }, [payroll, fsznRate, insuranceRate, incomeTaxRate]);

  // Calculate salary accrued based on worked days and working days in month
  const calculateSalaryAccrued = (workedDays: number) => {
    // Get the employee's base salary (required field)
    if (employee.base_salary === undefined || employee.base_salary <= 0) {
      console.error('Base salary is not set for employee:', employee.id);
      return 0;
    }
    
    // Get working days and holiday days from workNorm (required fields)
    if (!workNorm?.working_days) {
      console.error('Working days norm is not set for the period');
      return 0;
    }
    
    // Total working days includes all working days (including pre-holiday days) plus holiday days
    // Pre-holiday days are already included in working_days
    const totalWorkingDays = workNorm.working_days + (workNorm.holiday_days || 0);
    const dailyRate = employee.base_salary / totalWorkingDays;
    const calculatedSalary = dailyRate * workedDays;
    
    console.log('Salary calculation:', {
      baseSalary: employee.base_salary,
      workingDays: workNorm.working_days, // Already includes pre-holiday days
      holidayDays: workNorm.holiday_days || 0,
      totalWorkingDays,
      workedDays,
      dailyRate,
      calculatedSalary
    });
    
    return roundToTwoDecimals(calculatedSalary);
  };

  // Calculate income tax with tax benefit rule
  const calculateIncomeTax = (amount: number) => {
    console.log('calculateIncomeTax:', { amount, benefitAmount, taxDeduction });
    
    let taxableAmount = amount;
    let isTaxBenefitApplied = false;
    
    // Apply tax benefit only if the amount is below the benefit threshold
    if (amount < benefitAmount) {
      // Only apply the tax deduction to the amount that's below the threshold
      const amountBelowThreshold = amount;
      taxableAmount = Math.max(0, amountBelowThreshold - taxDeduction);
      isTaxBenefitApplied = true;
      console.log('Tax benefit applied:', { 
        amountBelowThreshold,
        taxDeduction,
        taxableAmount,
        isTaxBenefitApplied 
      });
    } else {
      // If above threshold, the full amount is taxable
      taxableAmount = amount;
      console.log('Tax benefit NOT applied, amount >= benefitAmount');
    }
    
    // Calculate the tax
    const tax = taxableAmount * (incomeTaxRate / 100);
    
    const result = {
      tax: roundToTwoDecimals(tax),
      isTaxBenefitApplied
    };
    
    console.log('Income tax calculation result:', result);
    return result;
  };

  // Calculate pension tax (1% of total accrued)
  const calculatePensionTax = (amount: number) => amount * 0.01;

  // Calculate FSZN tax (employer tax, 34% of total accrued by default)
  const calculateFsznTax = (amount: number) => amount * (fsznRate / 100);
  
  // Calculate insurance tax (employer tax, 0.6% of total accrued by default)
  const calculateInsuranceTax = (amount: number) => amount * (insuranceRate / 100);

  // Watch form values and recalculate when they change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Only recalculate if relevant fields change
      if (name && !['worked_days', 'bonus', 'extra_pay', 'advance_payment', 'other_deductions'].includes(name)) {
        return;
      }
      
      const formValues = form.getValues();
      const workedDays = Number(formValues.worked_days || 0);
      const bonus = Number(formValues.bonus || 0);
      const extraPay = Number(formValues.extra_pay || 0);
      const advancePayment = Number(formValues.advance_payment || 0);
      const otherDeductions = Number(formValues.other_deductions || 0);
      
      const salaryAccrued = roundToTwoDecimals(calculateSalaryAccrued(workedDays));
      const vacationPayCurrent = Number(formValues.vacation_pay_current || 0);
      const vacationPayNext = Number(formValues.vacation_pay_next || 0);
      const sickLeavePayment = Number(formValues.sick_leave_payment || 0);
      const totalAccrued = roundToTwoDecimals(
        salaryAccrued + bonus + extraPay + vacationPayCurrent + vacationPayNext + sickLeavePayment
      );
      
      // Calculate income tax with tax benefit rule
      console.log('Before calculating income tax:', { totalAccrued });
      const { tax: incomeTaxAmount, isTaxBenefitApplied } = calculateIncomeTax(totalAccrued);
      const incomeTax = roundToTwoDecimals(incomeTaxAmount);
      console.log('After calculating income tax:', { incomeTaxAmount, incomeTax, isTaxBenefitApplied });
      
      const pensionTax = roundToTwoDecimals(calculatePensionTax(totalAccrued));
      const totalDeductions = roundToTwoDecimals(incomeTax + pensionTax + otherDeductions); // Exclude advance payment from deductions
      const totalPayable = roundToTwoDecimals(totalAccrued - totalDeductions);
      // К ВЫДАЧЕ БЕЗ АВАНСА: К ВЫДАЧЕ - АВАНС
      const payableWithoutSalary = roundToTwoDecimals(totalPayable - advancePayment);
      const fsznTax = roundToTwoDecimals(calculateFsznTax(totalAccrued));
      const insuranceTax = roundToTwoDecimals(calculateInsuranceTax(totalAccrued));
      const totalEmployeeCost = roundToTwoDecimals(
        totalPayable + fsznTax + insuranceTax
      );
      
      setCalculatedValues({
        salaryAccrued,
        totalAccrued,
        incomeTax,
        pensionTax,
        totalDeductions,
        totalPayable,
        payableWithoutSalary,
        fsznTax,
        insuranceTax,
        totalEmployeeCost,
        isTaxBenefitApplied
      });
    });
    
    // Initial calculation
    const formValues = form.getValues();
    const workedDays = Number(formValues.worked_days || 0);
    const bonus = Number(formValues.bonus || 0);
    const extraPay = Number(formValues.extra_pay || 0);
    const advancePayment = Number(formValues.advance_payment || 0);
    const otherDeductions = Number(formValues.other_deductions || 0);
    
    const salaryAccrued = calculateSalaryAccrued(workedDays);
    const totalAccrued = salaryAccrued + bonus + extraPay;
    
    // Calculate income tax with tax benefit rule
    console.log('Before calculating income tax:', { totalAccrued, benefitAmount, taxDeduction });
    const { tax: incomeTaxAmount, isTaxBenefitApplied } = calculateIncomeTax(totalAccrued);
    const incomeTax = incomeTaxAmount;
    
    const pensionTax = calculatePensionTax(totalAccrued);
    const totalDeductions = incomeTax + pensionTax + otherDeductions; // Exclude advance payment from deductions
    const totalPayable = totalAccrued - totalDeductions;
    const payableWithoutSalary = bonus + extraPay - totalDeductions;
    const fsznTax = calculateFsznTax(totalAccrued);
    const insuranceTax = calculateInsuranceTax(totalAccrued);
    const totalEmployeeCost = totalPayable + fsznTax + insuranceTax;
    
    setCalculatedValues({
      salaryAccrued,
      totalAccrued,
      incomeTax,
      pensionTax,
      totalDeductions,
      totalPayable,
      payableWithoutSalary,
      fsznTax,
      insuranceTax,
      totalEmployeeCost,
      isTaxBenefitApplied
    });
    
    return () => subscription.unsubscribe();
  }, [form, workNorm, employee, minSalary, incomeTaxRate]);

  // Handle form submission
  const onSubmit = async (data: PayrollFormValues) => {
    setIsSubmitting(true);
    try {
      // Получаем оклад сотрудника
      const salary = employee.base_salary || 0;
      
      // Создаем объект с всеми данными для сохранения
      const payrollData = {
        // Базовые данные
        employee_id: employee.id,
        year,
        month,
        
        // Данные из формы
        worked_days: Number(data.worked_days),
        bonus: Number(data.bonus || 0),
        extra_pay: Number(data.extra_pay || 0),
        vacation_pay_current: Number(data.vacation_pay_current || 0),
        vacation_pay_next: Number(data.vacation_pay_next || 0),
        sick_leave_payment: Number(data.sick_leave_payment || 0),
        advance_payment: Number(data.advance_payment || 0),
        other_deductions: Number(data.other_deductions || 0),
        
        // Рассчитанные значения
        salary: roundToTwoDecimals(salary), // Оклад
        salary_accrued: calculatedValues.salaryAccrued, // Начислено по окладу
        total_accrued: calculatedValues.totalAccrued, // Всего начислено
        income_tax: calculatedValues.incomeTax, // Подоходный налог
        pension_tax: calculatedValues.pensionTax, // Пенсионный налог
        total_deductions: calculatedValues.totalDeductions, // Всего удержано
        total_payable: calculatedValues.totalPayable, // К выдаче
        payable_without_salary: calculatedValues.payableWithoutSalary, // К выдаче без аванса
        fszn_tax: calculatedValues.fsznTax, // ФСЗН
        insurance_tax: calculatedValues.insuranceTax, // Страховой взнос
        total_employee_cost: calculatedValues.totalEmployeeCost // Общая стоимость сотрудника
      };
      
      // Выводим в консоль данные, которые будут сохранены
      console.log('Saving payroll data from dialog:', payrollData);
      
      await onSave(payrollData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get the hourly rate based on full salary and work norm
  const getHourlyRate = () => {
    if (!workNorm?.norm_hours) return 0;
    return fullSalary / workNorm.norm_hours;
  };

  const renderInputField = (field: any, name: string, label: string, type: string = 'text') => (
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

  const dialogTitle = (
    <div>
      <div className="text-lg sm:text-xl">Начисление зарплаты</div>
      <div className="text-sm text-muted-foreground">
        {employee.name} • {new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
      </div>
    </div>
  );

  return (
    <CustomDialog 
      open={open} 
      onClose={() => onOpenChange(false)}
      title={dialogTitle}
    >
      <div className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Salary Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Оклад сотрудника</div>
                <div className="text-2xl font-bold text-primary">
                  {employee.base_salary !== undefined ? formatCurrency(employee.base_salary) : formatCurrency(0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(calculatedValues.incomeTax)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Рабочие дни</div>
                <div className="text-2xl font-bold">
                  {workNorm ? (workNorm.working_days + (workNorm.holiday_days || 0)) : '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {workNorm?.holiday_days ? `${workNorm.holiday_days} предпраздничных` : 'Нет данных'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Ставка в час</div>
                <div className="text-xl font-semibold">
                  {workNorm?.norm_hours ? formatCurrency(fullSalary / workNorm.norm_hours) : '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {workNorm?.norm_hours ? 'за 1 час' : 'Рассчитывается автоматически'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Премия итого</div>
                <div className="text-xl font-semibold text-primary">
                  {isLoadingKpiBonus ? '—' : formatCurrency(kpiTotalBonus)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isLoadingKpiBonus ? 'Загрузка...' : kpiTotalBonus > 0 ? 'по результатам KPI' : 'Нет данных'}
                </div>
              </div>
            </div>
            
            {/* Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <FormField
                  control={form.control}
                  name="worked_days"
                  render={({ field }) => renderInputField(
                    {
                      ...field,
                      disabled: isLoadingWorkedDays
                    }, 
                    'worked_days', 
                    'Отработано дней', 
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
                control={form.control}
                name="bonus"
                render={({ field }) => renderInputField(field, 'bonus', 'Премия', 'number')}
              />
              <FormField
                control={form.control}
                name="extra_pay"
                render={({ field }) => renderInputField(field, 'extra_pay', 'Доплата', 'number')}
              />
              <FormField
                control={form.control}
                name="vacation_pay_current"
                render={({ field }) => renderInputField(field, 'vacation_pay_current', 'Отпускные тек. мес.', 'number')}
              />
              <FormField
                control={form.control}
                name="vacation_pay_next"
                render={({ field }) => renderInputField(field, 'vacation_pay_next', 'Отпускные след. мес.', 'number')}
              />
              <FormField
                control={form.control}
                name="sick_leave_payment"
                render={({ field }) => renderInputField(field, 'sick_leave_payment', 'Больничный', 'number')}
              />
              <FormField
                control={form.control}
                name="advance_payment"
                render={({ field }) => renderInputField(field, 'advance_payment', 'Аванс', 'number')}
              />
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="other_deductions"
                  render={({ field }) => renderInputField(field, 'other_deductions', 'Прочие удержания', 'number')}
                />
              </div>
            </div>
            
            {/* Calculations Summary */}
            <div className="space-y-3">
              <div className="space-y-0">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Начислено по окладу:</span>
                  <span>{formatCurrency(calculatedValues.salaryAccrued)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Премия:</span>
                  <span>{formatCurrency(Number(form.getValues().bonus || 0))}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Доплата:</span>
                  <span>{formatCurrency(Number(form.getValues().extra_pay || 0))}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Отпускные тек. мес.:</span>
                  <span>{formatCurrency(Number(form.getValues().vacation_pay_current || 0))}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Отпускные след. мес.:</span>
                  <span>{formatCurrency(Number(form.getValues().vacation_pay_next || 0))}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Больничный:</span>
                  <span>{formatCurrency(Number(form.getValues().sick_leave_payment || 0))}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Аванс:</span>
                  <span>{formatCurrency(Number(form.getValues().advance_payment || 0))}</span>
                </div>
                <div className="flex justify-between font-semibold py-2 border-b bg-muted/30">
                  <span>ВСЕГО НАЧИСЛЕНО:</span>
                  <span>{formatCurrency(calculatedValues.totalAccrued)}</span>
                </div>
              </div>
              
              <div className="space-y-0 pt-4">
                <div className="flex justify-between text-sm py-2 border-b">
                  <div>
                    <span className="text-muted-foreground">Подоходный налог ({incomeTaxRate}%):</span>
                    {calculatedValues.isTaxBenefitApplied && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-sm">
                        Применена льгота
                      </span>
                    )}
                  </div>
                  {formatCurrency(calculatedValues.incomeTax)}
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Пенсионный взнос (1%):</span>
                  <span>{formatCurrency(calculatedValues.pensionTax)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Прочие удержания:</span>
                  <span>{formatCurrency(Number(form.getValues().other_deductions || 0))}</span>
                </div>
                <div className="flex justify-between font-semibold py-2 border-b bg-muted/30">
                  <span>ВСЕГО УДЕРЖАНО:</span>
                  <span>{formatCurrency(calculatedValues.totalDeductions)}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-lg font-bold py-3 border-y-2 mt-4 bg-muted/40">
                <span>К ВЫДАЧЕ:</span>
                <span className="text-primary">{formatCurrency(calculatedValues.totalPayable)}</span>
              </div>
              
              <div className="flex justify-between font-semibold py-2 border-b">
                <span>К ВЫДАЧЕ БЕЗ АВАНСА:</span>
                <span>{formatCurrency(calculatedValues.payableWithoutSalary)}</span>
              </div>
              
              <div className="space-y-0 pt-4 mt-2 border-t-2">
                <div className="text-sm font-medium py-2 border-b">Налоги работодателя:</div>
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

            {/* Form Actions */}
            <div className="sticky bottom-0 bg-background pt-4 pb-1 -mx-6 px-6 border-t">
              <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </CustomDialog>
  );
}
