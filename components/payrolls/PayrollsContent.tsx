'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { Employee, Payroll, WorkNorm } from '@/lib/supabase/types';
import { employeesApi } from '@/lib/supabase/employees';
import { payrollsApi } from '@/lib/supabase/payrolls';
import { workNormsApi } from '@/lib/supabase/workNorms';
import { settingsApi } from '@/lib/supabase/settings';

import { PayrollsTable } from './PayrollsTable';
import { EditWorkNormDialog } from './EditWorkNormDialog';
import { PayrollDialog } from './PayrollDialog';
import { MonthYearSelector } from './MonthYearSelector';
import { formatCurrency, roundToTwoDecimals } from './utils';

export function PayrollsContent() {
  // State for selected month/year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Data loading states
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [workNorm, setWorkNorm] = useState<WorkNorm | null>(null);
  const [minSalary, setMinSalary] = useState(0);
  const [incomeTaxRate, setIncomeTaxRate] = useState(13);
  const [fsznRate, setFsznRate] = useState(34);
  const [insuranceRate, setInsuranceRate] = useState(0.6);
  const [benefitAmount, setBenefitAmount] = useState(0);
  const [taxDeduction, setTaxDeduction] = useState(0);
  
  // UI state
  const [isEditWorkNormOpen, setIsEditWorkNormOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | undefined>();

  // Fetch all necessary data when month/year changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch employees
        console.log('Fetching employees...');
        const employeesData = await employeesApi.getAll();
        console.log('Employees fetched successfully:', employeesData.length);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error fetching employees:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке сотрудников');
        setIsLoading(false);
        return; // Stop execution if employees fetch fails
      }
      
      try {
        // Fetch payrolls for selected month/year
        console.log(`Fetching payrolls for ${selectedYear}/${selectedMonth}...`);
        const payrollsData = await payrollsApi.getByYearMonth(selectedYear, selectedMonth);
        console.log('Payrolls fetched successfully:', payrollsData.length);
        setPayrolls(payrollsData);
      } catch (error) {
        console.error(`Error fetching payrolls for ${selectedYear}/${selectedMonth}:`, error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке начислений');
        setIsLoading(false);
        return; // Stop execution if payrolls fetch fails
      }
      
      try {
        // Fetch work norm for selected month/year
        console.log(`Fetching work norm for ${selectedYear}/${selectedMonth}...`);
        let workNormData = await workNormsApi.getByYearMonth(selectedYear, selectedMonth);
        
        // If no work norm exists for this month, create a default one
        if (!workNormData) {
          console.log('No work norm found, creating default...');
          try {
            workNormData = await workNormsApi.upsert({
              year: selectedYear,
              month: selectedMonth,
              norm_hours: 168, // Default to 40 hours/week * 4.2 weeks
              working_days: 20, // Default working days in a month
              holiday_days: 0,  // Default to no holidays
            });
            console.log('Default work norm created:', workNormData);
          } catch (error) {
            console.error('Error creating default work norm:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            toast.error('Ошибка при создании нормы рабочего времени');
          }
        } else {
          console.log('Work norm found:', workNormData);
        }
        
        setWorkNorm(workNormData);
      } catch (error) {
        console.error(`Error fetching work norm for ${selectedYear}/${selectedMonth}:`, error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке нормы рабочего времени');
        setIsLoading(false);
        return; // Stop execution if work norm fetch fails
      }
      
      try {
        // Fetch settings
        console.log('Fetching settings...');
        const settings = await settingsApi.get();
        console.log('Settings fetched successfully:', settings);
        setMinSalary(settings.min_salary || 0);
        setIncomeTaxRate(settings.income_tax || 13);
        setFsznRate(settings.fszn_rate || 34);
        setInsuranceRate(settings.insurance_rate || 0.6);
        setBenefitAmount(settings.benefit_amount || 0);
        setTaxDeduction(settings.tax_deduction || 0);
      } catch (error) {
        console.error('Error fetching settings:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        toast.error('Ошибка при загрузке настроек');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth]);

  // Handle saving work norm
  const handleSaveWorkNorm = async (normHours: number): Promise<void> => {
    try {
      const updatedWorkNorm = await workNormsApi.upsert({
        year: selectedYear,
        month: selectedMonth,
        norm_hours: normHours,
        working_days: 20, // Default working days in a month
        holiday_days: 0,  // Default to no holidays
      });
      
      setWorkNorm(updatedWorkNorm);
      toast.success('Норма рабочего времени сохранена');
    } catch (error) {
      console.error('Error saving work norm:', error);
      toast.error('Ошибка при сохранении нормы рабочего времени');
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  // Handle saving payroll
  const handleSavePayroll = async (payrollData: any) => {
    if (!selectedEmployee) return;
    
    try {
      setIsLoading(true);
      
      // Сохраняем все данные, переданные из диалога
      // Все расчеты уже выполнены в диалоге и переданы в payrollData
      const payrollToSave = {
        ...payrollData,
        employee_id: selectedEmployee.id,
        year: selectedYear,
        month: selectedMonth,
      };
      
      // Проверяем, что все необходимые поля присутствуют
      console.log('Saving payroll data:', payrollToSave);
      
      // Убедимся, что все числовые поля округлены до 2 знаков после запятой
      const numericFields = [
        'worked_hours', 'salary', 'salary_accrued', 'bonus', 'extra_pay', 
        'income_tax', 'pension_tax', 'advance_payment', 'other_deductions',
        'total_accrued', 'total_deductions', 'total_payable', 'payable_without_salary',
        'fszn_tax', 'insurance_tax', 'total_employee_cost'
      ];
      
      numericFields.forEach(field => {
        if (payrollToSave[field] !== undefined) {
          payrollToSave[field] = roundToTwoDecimals(Number(payrollToSave[field]));
        }
      });

      // Save or update payroll
      const savedPayroll = await payrollsApi.upsert(payrollToSave);
      
      // Используем сохраненные данные
      const enhancedPayroll = {
        ...savedPayroll
      };
      
      // Update local state
      setPayrolls(prev => {
        const existingIndex = prev.findIndex(p => p.employee_id === selectedEmployee.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = enhancedPayroll;
          return updated;
        } else {
          return [...prev, enhancedPayroll];
        }
      });
      
      toast.success('Зарплата успешно сохранена');
      return savedPayroll;
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Ошибка при сохранении зарплаты');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit payroll click
  const handleEditPayroll = (employee: Employee) => {
    const employeePayroll = payrolls.find(p => p.employee_id === employee.id);
    setSelectedEmployee(employee);
    setSelectedPayroll(employeePayroll || undefined);
    setIsPayrollDialogOpen(true);
  };

  // Format month name for display
  const monthName = format(new Date(selectedYear, selectedMonth - 1), 'LLLL', { locale: ru });
  const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6 p-4 bg-card">
        <h1 className="text-2xl font-bold">Зарплаты</h1>
        <div className="flex items-center space-x-4">
          <MonthYearSelector
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-8 mb-4">
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">Норма рабочего времени</div>
          <div className="text-2xl font-bold">{workNorm?.norm_hours}</div>
        </div>
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">ВСЕГО НАЧИСЛЕНО</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(payrolls.reduce((sum, payroll) => sum + (payroll.total_accrued || 0), 0))}
          </div>
        </div>
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">ФОТ</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(payrolls.reduce((sum, payroll) => sum + (payroll.total_employee_cost || 0), 0))}
          </div>
        </div>
        <div className="p-4 border rounded-md">
          <div className="text-sm font-medium">ФОТ БЕЗ АВАНСА</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(payrolls.reduce((sum, payroll) => sum + ((payroll.total_employee_cost || 0) - (payroll.advance_payment || 0)), 0))}
          </div>
        </div>
      </div>

      {/* Payrolls Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Начисления за {formattedMonthName} {selectedYear} года
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PayrollsTable
            employees={employees}
            payrolls={payrolls.map(p => ({
              ...p,
              employee: employees.find(e => e.id === p.employee_id)!
            }))}
            workNorm={workNorm}
            minSalary={minSalary}
            incomeTaxRate={incomeTaxRate}
            onEditPayroll={handleEditPayroll}
          />
        </CardContent>
      </Card>

      {/* Edit Work Norm Dialog */}
      <EditWorkNormDialog
        open={isEditWorkNormOpen}
        onOpenChange={setIsEditWorkNormOpen}
        workNorm={workNorm}
        year={selectedYear}
        month={selectedMonth}
        onSave={handleSaveWorkNorm}
      />

      {/* Payroll Dialog */}
      {selectedEmployee && (
        <PayrollDialog
          open={isPayrollDialogOpen}
          onOpenChange={setIsPayrollDialogOpen}
          employee={selectedEmployee}
          payroll={selectedPayroll}
          workNorm={workNorm}
          year={selectedYear}
          month={selectedMonth}
          minSalary={minSalary}
          incomeTaxRate={incomeTaxRate}
          fsznRate={fsznRate}
          insuranceRate={insuranceRate}
          benefitAmount={benefitAmount}
          taxDeduction={taxDeduction}
          onSave={handleSavePayroll}
        />
      )}
    </div>
  );
}
