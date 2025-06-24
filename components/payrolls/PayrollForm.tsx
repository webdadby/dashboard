import React, { useCallback, useMemo } from 'react';
import { useForm, useWatch, FormProvider, useFormContext, Control, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { WorkedDaysSection } from './WorkedDaysSection';
import { PaymentDetailsSection } from './PaymentDetailsSection';
import { PayrollSummary } from './PayrollSummary';
import { TaxCalculationsSection } from './TaxCalculationsSection';
import { KpiBonusSection } from './KpiBonusSection';
import { PayrollFormValues, PayrollDialogProps, PayrollFormSubmitData, PayrollCalculations, WorkNorm } from './types';
import { formatCurrency } from './utils';

// Define form schema
const formSchema = z.object({
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
  payment_date: z.string().nullable(),
});

interface PayrollFormInnerProps {
  control: Control<PayrollFormValues>;
  kpiTotalBonus: number;
  isLoadingKpiBonus: boolean;
  isLoadingWorkedDays: boolean;
  onKpiBonusClick: () => void;
  onFetchWorkedDays: () => Promise<void>;
  workNorm: WorkNorm | null;
  calculatedValues: PayrollCalculations;
  onSave: (data: PayrollFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface PayrollFormProps extends Omit<PayrollDialogProps, 'workNorm'> {
  onSave: (data: PayrollFormSubmitData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  kpiTotalBonus: number;
  isLoadingKpiBonus: boolean;
  isLoadingWorkedDays: boolean;
  onKpiBonusClick: () => void;
  onFetchWorkedDays: () => Promise<void>;
  workNorm: WorkNorm | null;
  initialValues?: Partial<PayrollFormValues>;
}

// Inner component that uses the form context
const PayrollFormInner: React.FC<PayrollFormInnerProps> = ({
  control,
  kpiTotalBonus,
  isLoadingKpiBonus,
  isLoadingWorkedDays,
  onKpiBonusClick,
  onFetchWorkedDays,
  workNorm,
  calculatedValues,
  onSave,
  onCancel,
  isSubmitting,
}) => {
  const form = useFormContext<PayrollFormValues>();
  
  return (
    <Form>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <div className="space-y-4">
          <WorkedDaysSection
            control={control}
            workNorm={workNorm}
            isLoadingWorkedDays={isLoadingWorkedDays}
            onFetchWorkedDays={onFetchWorkedDays}
          />

          <KpiBonusSection
            control={control}
            kpiTotalBonus={kpiTotalBonus}
            isLoadingKpiBonus={isLoadingKpiBonus}
            onKpiBonusClick={onKpiBonusClick}
          />
          
          <PaymentDetailsSection control={control} />
          <PayrollSummary 
            salaryAccrued={calculatedValues.baseSalary}
            totalAccrued={calculatedValues.totalAccrued}
            incomeTax={calculatedValues.incomeTax}
            pensionTax={calculatedValues.pensionTax}
            fsznTax={calculatedValues.fsznTax}
            insuranceTax={calculatedValues.insuranceTax}
            totalDeductions={calculatedValues.totalDeductions}
            totalPayable={calculatedValues.totalPayable}
            payableWithoutSalary={calculatedValues.payableWithoutSalary}
            totalEmployeeCost={calculatedValues.totalEmployeeCost}
            isTaxBenefitApplied={calculatedValues.isTaxBenefitApplied}
          />
          <TaxCalculationsSection calculatedValues={calculatedValues} />
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
            Сохранить
          </Button>
        </div>
      </form>
    </Form>
  );
};

export const PayrollForm: React.FC<PayrollFormProps> = ({
  employee,
  onSave,
  onCancel,
  isSubmitting,
  kpiTotalBonus,
  isLoadingKpiBonus,
  isLoadingWorkedDays,
  onKpiBonusClick,
  onFetchWorkedDays,
  workNorm,
  initialValues,
}) => {
  const formMethods = useForm<PayrollFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      worked_days: initialValues?.worked_days ?? workNorm?.working_days ?? 0,
      bonus: initialValues?.bonus ?? 0,
      extra_pay: initialValues?.extra_pay ?? 0,
      vacation_pay_current: initialValues?.vacation_pay_current ?? 0,
      vacation_pay_next: initialValues?.vacation_pay_next ?? 0,
      sick_leave_payment: initialValues?.sick_leave_payment ?? 0,
      advance_payment: initialValues?.advance_payment ?? 0,
      other_deductions: initialValues?.other_deductions ?? 0,
      payment_date: initialValues?.payment_date ?? null,
    },
  }) as unknown as UseFormReturn<PayrollFormValues>; // Type assertion to fix UseFormReturn type

  // Calculate payroll values based on form values
  const formValues = useWatch({
    control: formMethods.control,
    defaultValue: formMethods.getValues(),
  }) as PayrollFormValues;
  
  // Ensure workNorm is properly typed
  const workNormValue = workNorm; // This is already typed as WorkNorm | null

  const calculatedValues = useMemo<PayrollCalculations>(() => {
    const baseSalary = employee.salary;
    const bonus = Number(formValues.bonus) || 0;
    const extraPay = Number(formValues.extra_pay) || 0;
    const vacationPayCurrent = Number(formValues.vacation_pay_current) || 0;
    const vacationPayNext = Number(formValues.vacation_pay_next) || 0;
    const sickLeavePayment = Number(formValues.sick_leave_payment) || 0;
    const advancePayment = Number(formValues.advance_payment) || 0;
    const otherDeductions = Number(formValues.other_deductions) || 0;
    
    const totalAccrued = baseSalary + bonus + extraPay + vacationPayCurrent + vacationPayNext + sickLeavePayment + advancePayment + otherDeductions;
    
    // Simplified calculations - replace with your actual logic
    const incomeTax = (baseSalary * 0.13);
    const pensionTax = (baseSalary * 0.1);
    const fsznTax = (baseSalary * 0.02);
    const insuranceTax = (baseSalary * 0.051);
    const totalDeductions = incomeTax + pensionTax + fsznTax + insuranceTax;
    const totalEmployeeCost = baseSalary + totalDeductions;
    
    return {
      baseSalary,
      bonus,
      extraPay,
      vacationPayCurrent,
      vacationPayNext,
      sickLeavePayment,
      advancePayment,
      otherDeductions,
      totalAccrued,
      incomeTax,
      pensionTax,
      fsznTax,
      insuranceTax,
      totalDeductions,
      totalPayable: totalAccrued - totalDeductions,
      payableWithoutSalary: 0, // Add your calculation
      totalEmployeeCost,
      isTaxBenefitApplied: false, // Add your logic
    };
  }, [employee.salary, formValues]);

  const handleSubmit = useCallback(async (data: PayrollFormValues) => {
    try {
      // Ensure all number fields are properly converted
      const formData: PayrollFormSubmitData = {
        worked_days: data.worked_days ?? 0,
        bonus: data.bonus ?? 0,
        extra_pay: data.extra_pay ?? 0,
        vacation_pay_current: data.vacation_pay_current ?? 0,
        vacation_pay_next: data.vacation_pay_next ?? 0,
        sick_leave_payment: data.sick_leave_payment ?? 0,
        advance_payment: data.advance_payment ?? 0,
        other_deductions: data.other_deductions ?? 0,
        payment_date: data.payment_date?.toString() ?? null, // Ensure payment_date is a string or null
        employee_id: employee.id,
        year: employee.year ?? new Date().getFullYear(),
        month: employee.month ?? new Date().getMonth() + 1,
      };
      
      await onSave(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      // You can add error handling logic here if needed
    }
  }, [employee, onSave]);

  const formContextValue = {
    ...formMethods,
    // Add any missing required properties from UseFormReturn
    watch: formMethods.watch,
    getValues: formMethods.getValues,
    getFieldState: formMethods.getFieldState,
    setError: formMethods.setError,
    clearErrors: formMethods.clearErrors,
    setValue: formMethods.setValue,
    trigger: formMethods.trigger,
    formState: formMethods.formState,
    reset: formMethods.reset,
    handleSubmit: formMethods.handleSubmit,
    unregister: formMethods.unregister,
    control: formMethods.control,
    register: formMethods.register,
    setFocus: formMethods.setFocus,
  };

  return (
    <FormProvider {...formContextValue}>
      <PayrollFormInner
        control={formMethods.control}
        kpiTotalBonus={kpiTotalBonus}
        isLoadingKpiBonus={isLoadingKpiBonus}
        isLoadingWorkedDays={isLoadingWorkedDays}
        onKpiBonusClick={onKpiBonusClick}
        onFetchWorkedDays={onFetchWorkedDays}
        workNorm={workNorm}
        calculatedValues={calculatedValues}
        onSave={handleSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    </FormProvider>
  );
};
